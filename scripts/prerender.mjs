/**
 * Prerender — генерация статического HTML для публичных маршрутов SPA.
 *
 * Запускается после `vite build`. Использует Playwright, чтобы открыть
 * каждый маршрут, дождаться полного рендеринга React и сохранить HTML
 * в dist/{route}/index.html.
 *
 * Использование: node scripts/prerender.mjs
 */

import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

/**
 * Обратная транслитерация: из латинского slug → читаемый русский текст.
 * Используется как fallback, если API не вернул данные тир-листа.
 * 
 * Пример: "moi-lyubimye-knigi-2024-a7bsy0" → "Мои любимые книги 2024"
 */
function deslugify(slug) {
  // Убираем случайный суффикс (последний сегмент, короткий, с цифрами)
  const segments = slug.split('-');
  const last = segments[segments.length - 1];
  // Суффикс уникальности: короткий, буквы+цифры (например "a7bsy0")
  // Числа без букв ("10", "2024") — не суффикс, а часть названия
  if (last && last.length <= 8 && /^[a-z0-9]+$/.test(last) && /[a-z]/.test(last) && /\d/.test(last)) {
    segments.pop();
  }
  const latinText = segments.join(' ');

  // Обратная транслитерация: латиница → кириллица
  // Многосимвольные сопоставления должны обрабатываться раньше односимвольных
  const map = [
    ['shch', 'щ'], ['sh', 'ш'], ['ch', 'ч'], ['zh', 'ж'],
    ['yu', 'ю'], ['ya', 'я'], ['yo', 'ё'],
    ['j', 'й'], ['c', 'ц'], ['h', 'х'],
    ['a', 'а'], ['b', 'б'], ['v', 'в'], ['g', 'г'], ['d', 'д'],
    ['e', 'е'], ['z', 'з'], ['i', 'и'], ['k', 'к'], ['l', 'л'],
    ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'],
    ['s', 'с'], ['t', 'т'], ['u', 'у'], ['f', 'ф'], ['y', 'ы'],
  ];

  let result = latinText;
  for (const [latin, cyrillic] of map) {
    result = result.replace(new RegExp(latin, 'g'), cyrillic);
  }

  // Если после всех преобразований пусто — возвращаем "Книжный тир-лист"
  if (!result.trim()) return "Книжный тир-лист";
  // Первая буква заглавная
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// для HTTP запросов к localhost не нужен специальный Agent.
// В Node.js 22+ fetch встроен и работает напрямую.

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

// Путь к JSON со slug'ами коллекций (fallback, если API бэкенда недоступен)
const COLLECTION_ROUTES_PATH = resolve(ROOT, "src", "data", "collection-routes.json");

// Публичные маршруты для индексации
const ROUTES = [
  { path: "/",           name: "Главная" },
  { path: "/auth",       name: "Вход / Регистрация" },
  { path: "/rankings",   name: "Рейтинг книг" },
  { path: "/community",  name: "Сообщество" },
  { path: "/history",    name: "История" },
  { path: "/what-to-read", name: "Что почитать" },
  { path: "/templates",  name: "Шаблоны" },
  { path: "/forum",      name: "Форум" },
  { path: "/about",      name: "О проекте" },
  { path: "/pricing",    name: "Тарифы" },
  { path: "/contact",    name: "Контакты" },
  { path: "/privacy",    name: "Политика конфиденциальности" },
  { path: "/terms",      name: "Условия использования" },
];

// URL бэкенда для прокси API-запросов при пререндеринге
const BACKEND_URL = process.env.API_URL || "http://localhost:8080";

/**
 * Проксирует API-запрос из браузера на реальный бэкенд.
 * Собирает тело запроса, отправляет fetch, собирает ответ — и отдаёт целиком.
 */
function proxyApiRequest(req, res) {
  let done = false;
  const send = (status, headers, body) => {
    if (done) return;
    done = true;
    res.writeHead(status, headers);
    res.end(body);
  };

  const bodyChunks = [];
  req.on("data", (chunk) => bodyChunks.push(chunk));
  req.on("end", async () => {
    try {
      const body = bodyChunks.length > 0 ? Buffer.concat(bodyChunks) : undefined;
      const headers = {
        "content-type": req.headers["content-type"] || "",
        accept: req.headers["accept"] || "application/json",
        "user-agent": req.headers["user-agent"] || "prerender",
      };

      // Пытаемся сначала https, при ошибке — http (fallback для самоподписанных сертификатов)
      const tryFetch = async (url) => {
        console.log('[PRERENDER API]', url);
        const apiRes = await fetch(url, { method: req.method, headers, body });
        console.log('[PRERENDER API RESPONSE]', apiRes.status, apiRes.headers.get('content-type'), apiRes.headers.get('content-length'));
        const responseHeaders = {};
        for (const [key, value] of apiRes.headers.entries()) {
          if (!["content-encoding", "transfer-encoding", "content-length", "connection"].includes(key)) {
            responseHeaders[key] = value;
          }
        }
        const text = await apiRes.text();
        console.log('[PRERENDER API BODY]', text.slice(0, 500));
        log(`  Proxy: ${req.method} ${req.url} → ${apiRes.status} (${(apiRes.headers.get("content-type") || "no type").split(";")[0]}, ${text.length}B)`);
        send(apiRes.status, responseHeaders, text);
      };

      const apiUrl = `${BACKEND_URL}${req.url}`;
      // Если BACKEND_URL начинается с https://localhost — сразу пробуем http
      if (BACKEND_URL.startsWith('https://localhost')) {
        const httpUrl = apiUrl.replace('https://', 'http://');
        try {
          await tryFetch(httpUrl);
        } catch {
          // если http не сработал — пробуем https (на случай если он всё же настроен)
          await tryFetch(apiUrl);
        }
      } else {
        await tryFetch(apiUrl);
      }
    } catch (err) {
      log(`⚠️  Proxy error for ${req.url}: ${err?.message || err}`);
      const fallback = resolve(DIST, "index.html");
      if (existsSync(fallback)) {
        send(200, { "Content-Type": "text/html; charset=utf-8" }, readFileSync(fallback));
      } else {
        send(502, {}, "Backend unavailable");
      }
    }
  });
  req.on("error", () => send(502, {}, "Backend unavailable"));
  req.on("close", () => { done = true; });
}

/**
 * Пытается получить список публичных тир-листов с бэкенда.
 * Если бэкенд доступен — добавляет их URL в ROUTES для prerender'а.
 */
async function addPublicTierListRoutes() {
  try {
    log(`📡 Fetching public tier lists from ${BACKEND_URL}/api/tier-lists/public…`);
    const res = await fetch(`${BACKEND_URL}/api/tier-lists/public?pageSize=50&sortBy=likes`);
    if (!res.ok) {
      log(`⚠️  API responded with ${res.status}, skipping tier-list prerender`);
      return;
    }
    const body = await res.json();
    const items = body.data || [];
    if (items.length === 0) {
      log("⚠️  No public tier lists found, skipping");
      return;
    }
    for (const item of items) {
      const slug = item.slug;
      if (!slug) {
        log(`  ⚠️  Tier list "${item.title}" has no slug, skipping`);
        continue;
      }
      const path = `/tier-lists/${slug}`;
      ROUTES.push({ path, name: `Тир-лист: ${item.title}` });
      log(`  → ${path} (${item.title})`);
    }
    log(`✅ Added ${items.filter(i => i.slug).length} tier lists to prerender`);
    backendAvailable = true;
  } catch (err) {
    log(`⚠️  Cannot reach backend (${BACKEND_URL}): ${err.message}`);
    log("⚠️  Tier-list prerender skipped (will work on server during deploy)");
  }
}

/**
 * Категории для страниц /topics/.
 * Читается из src/data/category-ids.json — единый источник правды.
 */
const CATEGORY_IDS_PATH = resolve(__dirname, "..", "src", "data", "category-ids.json");
const TOPIC_CATEGORIES = JSON.parse(readFileSync(CATEGORY_IDS_PATH, "utf-8"));

/**
 * Добавляет страницы категорий в ROUTES для prerender'а.
 * Бэкенд не требуется — список статический.
 */
async function addTopicRoutes() {
  log(`📡 Adding topic pages for ${TOPIC_CATEGORIES.length} categories…`);
  for (const cat of TOPIC_CATEGORIES) {
    const path = `/topics/${cat.id}`;
    ROUTES.push({ path, name: cat.label });
    log(`  → ${path} (${cat.label})`);
  }
  log(`✅ Added ${TOPIC_CATEGORIES.length} topic pages to prerender`);
}

/**
 * Пытается получить список опубликованных коллекций с бэкенда.
 * Если бэкенд доступен — добавляет их URL в ROUTES для prerender'а.
 */
async function addPublicCollectionRoutes() {
  // Сначала пробуем получить список коллекций с бэкенда (через API)
  let items = [];
  let fromApi = false;

  try {
    log(`📡 Fetching public collections from ${BACKEND_URL}/api/collections…`);
    const res = await fetch(`${BACKEND_URL}/api/collections?pageSize=200`);
    if (res.ok) {
      const body = await res.json();
      items = body.data || [];
      if (items.length === 0) {
        log("⚠️  No published collections found via API");
      } else {
        log(`✅ API returned ${items.length} collections`);
        fromApi = true;
        backendAvailable = true;
      }
    } else {
      log(`⚠️  API responded with ${res.status}`);
    }
  } catch (err) {
    log(`⚠️  Cannot reach backend for collections (${BACKEND_URL}): ${err.message}`);
  }

  // Если API недоступен — читаем из JSON-файла (должен быть актуален)
  if (!fromApi) {
    log("📂 Falling back to collection-routes.json…");
    try {
      const raw = readFileSync(COLLECTION_ROUTES_PATH, "utf-8");
      items = JSON.parse(raw);
      if (items.length === 0) {
        log("⚠️  collection-routes.json is empty");
        return;
      }
      log(`✅ Loaded ${items.length} collections from ${COLLECTION_ROUTES_PATH}`);
    } catch (jsonErr) {
      log(`⚠️  Cannot read collection-routes.json: ${jsonErr.message}`);
      log("⚠️  Collection prerender skipped entirely");
      return;
    }
  }

  for (const item of items) {
    const slug = item.slug;
    if (!slug) {
      log(`  ⚠️  Collection "${item.title}" has no slug, skipping`);
      continue;
    }
    const path = `/collections/${slug}`;
    ROUTES.push({ path, name: `Подборка: ${item.title}` });
    log(`  → ${path} (${item.title})`);
  }
  log(`✅ Added ${items.filter(i => i.slug).length} collections to prerender`);
}

const PORT = 4173;
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

function log(msg) {
  console.log(`[prerender] ${msg}`);
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not start in time");
}

/**
 * Очищает дублирующиеся теги в &lt;head&gt;: title, canonical и meta с одинаковым name/property.
 * Оставляет только первое вхождение каждого. Вызывается на полном HTML после page.content().
 */
function deduplicateHeadTags(html) {
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) return html;

  const headContent = headMatch[1];
  const seen = new Set();
  const resultTags = [];
  const tagRegex = /<(\w+)(?:[^>]*\/>|[^>]*>[\s\S]*?<\/\1>)|<(\w+)(?:[^>]*)>/gi;
  let tagMatch;

  while ((tagMatch = tagRegex.exec(headContent)) !== null) {
    const fullTag = tagMatch[0];

    // Определяем тип тега и ключ для дедупликации
    let key = null;

    // <title>...</title>
    const titleMatch = fullTag.match(/^<title/i);
    if (titleMatch) {
      key = 'title';
    }

    // <link rel="canonical" ...>
    const canonicalMatch = fullTag.match(/^<link\s[^>]*rel="canonical"/i);
    if (canonicalMatch) {
      key = 'canonical';
    }

    // <meta name="..." ...>
    const metaNameMatch = fullTag.match(/^<meta\s[^>]*name="([^"]+)"/i);
    if (metaNameMatch) {
      key = `meta:${metaNameMatch[1].toLowerCase()}`;
    }

    // <meta property="..." ...>
    const metaPropMatch = fullTag.match(/^<meta\s[^>]*property="([^"]+)"/i);
    if (metaPropMatch) {
      key = `meta:${metaPropMatch[1].toLowerCase()}`;
    }

    if (key && seen.has(key)) {
      continue; // пропускаем дубль
    }
    if (key) seen.add(key);
    resultTags.push(fullTag);
  }

  return html.replace(headContent, resultTags.join('\n    '));
}

/** Будет установлен в true, если бэкенд доступен во время сборки */
let backendAvailable = false;

/** Количество параллельно обрабатываемых страниц */
const CONCURRENCY = 4;

/** Таймаут ожидания загрузки контента на странице (статичные маршруты) */
const PAGE_TIMEOUT = 10_000;

/** Таймаут для динамических страниц (тир-листы, коллекции) */
const PAGE_TIMEOUT_DYNAMIC = 30_000;

/**
 * Дефолтные заголовки из SPA-заготовки (index.html) и SEOHead fallback.
 * Пока title один из них — данные страницы ещё не загрузились.
 */
const DEFAULT_TITLES = [
  'BookStrata — интерактивный рейтинг книг, твоё книжное пространство | BookStrata',
  'Интерактивный рейтинг книг — топ лучших книг и что почитать | BookStrata',
];

/**
 * Проверяет, загрузился ли реальный контент на странице.
 *
 * Приоритеты (по надёжности):
 * 1. canonical-ссылка содержит специфичный путь (не корень сайта) —
 *    значит SEOHead отработал с данными из API
 * 2. Fallback: в #root > 2000 символов, нет скелетонов и "Загрузка..."
 * 3. title не равен дефолтному — значит React обновил его через SEOHead
 */
async function pageHasContent(page, routePath) {
  const diag = await page.evaluate((defaultTitles) => {
    const canonical = document.querySelector('link[rel="canonical"]');
    const canonicalHref = canonical?.getAttribute('href') || null;

    const root = document.getElementById("root");
    const rootHtml = root?.innerHTML || '';
    const rootText = root?.innerText || '';
    const rootLen = rootHtml.length;

    const title = document.title || '';

    const hasAnimatePulse = rootHtml.includes("animate-pulse");
    const hasLoading = rootHtml.includes("Загрузка...") || rootHtml.includes("Загрузка");
    const hasContent = rootLen >= 2000 && !hasAnimatePulse && !hasLoading;

    const isCanonicalSet = canonicalHref !== null
      && canonicalHref !== 'https://bookstrata.ru'
      && canonicalHref !== 'https://bookstrata.ru/';

    const isTitleSet = !defaultTitles.includes(title) && title.includes('| BookStrata');

    return {
      rootLen,
      rootPreview: rootText.slice(0, 300),
      hasAnimatePulse,
      hasLoading,
      hasContent,
      canonicalHref,
      isCanonicalSet,
      title,
      isTitleSet,
    };
  }, DEFAULT_TITLES);

  // Логируем раз в 2 секунды (каждый 4-й check при интервале 500ms)
  if (!pageHasContent._counter) pageHasContent._counter = 0;
  pageHasContent._counter++;
  if (pageHasContent._counter % 4 === 1) {
    log(`  🔍 Content check [${routePath}]: len=${diag.rootLen}, pulse=${diag.hasAnimatePulse}, loading=${diag.hasLoading}, canonical="${diag.canonicalHref?.slice(0, 60)}", title="${diag.title?.slice(0, 60)}"`);
    if (diag.rootPreview) {
      log(`  🔍  root preview: ${diag.rootPreview.slice(0, 200).replace(/\n/g, ' ')}`);
    }
  }

  // Собственно проверка — те же критерии, что и раньше
  if (diag.isCanonicalSet) return true;
  if (diag.hasContent) return true;
  if (diag.isTitleSet) return true;

  return false;
}

/**
 * Ждёт, пока на странице появится реальный контент.
 * Проверяет каждые 500 мс, максимум timeout мс.
 */
async function waitForContent(page, timeout = PAGE_TIMEOUT, routePath = '') {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await pageHasContent(page, routePath)) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

/**
 * Ждёт, пока document.title изменится с дефолтного на кастомный (от SEOHead).
 * Это нужно, потому что SEOHead устанавливает title через useEffect,
 * который отрабатывает после того, как Helmet обновит canonical/head.
 */
async function waitForTitle(page, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const title = await page.title();
    if (!DEFAULT_TITLES.includes(title)) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * Обрабатывает один маршрут: открывает страницу, ждёт контент,
 * при необходимости внедряет fallback, сохраняет HTML.
 */
async function processRoute(browser, route) {
  const url = `${BASE}${route.path}`;
  const isTierList = route.path.startsWith("/tier-lists/");
  const isCollection = route.path.startsWith("/collections/");
  const isRankings = route.path.startsWith("/rankings");

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Не используем бота — Chromium как обычный пользователь
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Блокируем запросы к API, только если бэкенд недоступен
    if (!backendAvailable) {
      await page.route("**/api/**", (route) => route.abort());
    }
    await page.route("**/sitemap.xml", (route) => route.abort());

    // Блокируем эндпоинты, которые возвращают 404 в пререндере.
    // Используем fulfill вместо abort, чтобы не вызывать network error в React.
    await page.route("**/api/auth/refresh", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unauthorized" }),
    }));
    await page.route("**/api/log", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }));

    // Логи браузера для диагностики
    page.on("console", (msg) => {
      log(`  🖥️ [${msg.type()}] ${msg.text()}`);
    });
    // Перехватываем консольные ошибки (не даём им упасть в reject)
    page.on("pageerror", (err) => {
      log(`  ⚠️  JS error on ${route.path}: ${err.message}`);
      log(`  ⚠️  Stack: ${err.stack?.split('\n').slice(0, 6).join(' → ')}`);
    });

    // Логируем все API-запросы, которые делает браузер
    page.on("request", (req) => {
      if (req.url().includes('/api/') && !req.url().includes('/api/log')) {
        log(`  🌐 Request: ${req.method()} ${req.url()}`);
      }
    });
    page.on("requestfinished", (req) => {
      if (req.url().includes('/api/') && !req.url().includes('/api/log')) {
        const resp = req.response();
        log(`  🌐 Response: ${req.method()} ${req.url()} → ${resp?.status || 'no-resp'}`);
      }
    });
    page.on("requestfailed", (req) => {
      if (req.url().includes('/api/')) {
        log(`  🌐 FAILED: ${req.method()} ${req.url()} → ${req.failure()?.errorText || 'unknown'}`);
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // ── Ждём реальный контент (проверка каждые 500 мс) ──
    // Для динамических страниц (тир-листы, коллекции) даём больше времени
    const contentTimeout = (isTierList || isCollection) ? PAGE_TIMEOUT_DYNAMIC : PAGE_TIMEOUT;
    const contentLoaded = await waitForContent(page, contentTimeout, route.path);

    // ── Дополнительно ждём обновления title (useEffect SEOHead) ──
    // После того как canonical/og-теги обновились (Helmet), нужно дать время
    // на установку document.title через useEffect в SEOHead.
    // Для корневой страницы пропускаем — её title совпадает с дефолтным.
    if (contentLoaded && route.path !== '/') {
      await waitForTitle(page, 5000);
    }

    // ── Fallback: если контент не загрузился ──
    let finalTitle = await page.title();

    if (!contentLoaded) {
      log(`  ⚡ Контент не загрузился, генерирую fallback…`);

      let fallbackTitle, fallbackDesc, canonicalPath;
      let fallbackBodyHtml = "";

      if (isTierList) {
        const slug = route.path.replace("/tier-lists/", "");
        // Используем name из ROUTES (там реальное название из API), а не deslugify
        const readableTitle = route.name.replace("Тир-лист: ", "") || deslugify(slug);
        fallbackTitle = `${readableTitle} — книжный тир-лист | BookStrata`;
        fallbackDesc = `Тир-лист «${readableTitle}» — визуальный рейтинг книг, составленный читателем на BookStrata. Оценивайте и сортируйте любимые книги.`;
        canonicalPath = route.path;
        fallbackBodyHtml = `
<article itemscope itemtype="https://schema.org/ItemList">
  <h1 itemprop="name">${readableTitle}</h1>
  <p itemprop="description">${fallbackDesc}</p>
  <p>Тир-лист временно недоступен. Зайдите позже, чтобы увидеть книги в подборке.</p>
  <nav>
    <a href="/">BookStrata — главная</a> |
    <a href="/rankings">Рейтинг книг</a>
  </nav>
</article>`;
      } else if (isCollection) {
        const collectionName = route.name.replace("Подборка: ", "");
        fallbackTitle = `${collectionName} — подборка книг | BookStrata`;
        fallbackDesc = `Редакционная подборка книг «${collectionName}» — лучшие книги по жанру, рейтинг и рекомендации читателей на BookStrata.`;
        canonicalPath = route.path;
        fallbackBodyHtml = `
<article itemscope itemtype="https://schema.org/Collection">
  <h1 itemprop="name">${collectionName}</h1>
  <p itemprop="description">${fallbackDesc}</p>
  <p>Книги из подборки временно недоступны. Зайдите позже.</p>
  <nav>
    <a href="/">BookStrata — главная</a> |
    <a href="/rankings">Рейтинг книг</a>
  </nav>
</article>`;
      } else {
        // Статические страницы (главная, контакты, privacy, etc.)
        const pageName = route.name || "BookStrata";
        fallbackTitle = `${pageName} | BookStrata`;
        fallbackDesc = `BookStrata — интерактивный рейтинг книг. Составляйте визуальные подборки, находите что почитать и делитесь мнением.`;
        canonicalPath = route.path;
        fallbackBodyHtml = `
<main>
  <h1>${pageName}</h1>
  <p>${fallbackDesc}</p>
</main>`;
      }

      finalTitle = fallbackTitle;

      await page.evaluate(({ t, d, cp, bodyHtml }) => {
        // 1. Устанавливаем <title> — и через document.title, и через DOM-элемент
        document.title = t;
        let titleEl = document.querySelector('title');
        if (!titleEl) {
          titleEl = document.createElement('title');
          document.head.appendChild(titleEl);
        }
        titleEl.textContent = t;

        // 2. Мета-теги
        const setMeta = (selector, attr, value) => {
          const el = document.querySelector(selector);
          if (el) el.setAttribute(attr, value);
        };
        setMeta('meta[property="og:title"]', "content", t);
        setMeta('meta[name="description"]', "content", d);
        setMeta('meta[property="og:description"]', "content", d);
        setMeta('meta[name="twitter:description"]', "content", d);
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && cp) {
          canonical.setAttribute("href", `https://bookstrata.ru${cp}`);
        }

        // 3. Заменяем root на статический контент
        const root = document.getElementById("root");
        if (root && (root.innerHTML.length < 2000 || root.innerHTML.includes("animate-pulse"))) {
          root.innerHTML = bodyHtml;
        }

        // 4. Скрипты НЕ удаляем — React должен иметь возможность
        //    гидратироваться и взять управление на себя, если это SPA-страница.
        //    Раньше мы удаляли скрипты, но это ломало сайт при любом fallback.
      }, { t: fallbackTitle, d: fallbackDesc, cp: canonicalPath, bodyHtml: fallbackBodyHtml });

      log(`  ⚡ Fallback: "${fallbackTitle}"`);
    }

    // Небольшая пауза для завершения анимаций
    await page.waitForTimeout(300);

    log(`    title: ${finalTitle}`);

    // Логируем SEO-мета-теги
    const seo = await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    }));
    if (seo.canonical !== 'https://bookstrata.ru' && seo.canonical !== 'https://bookstrata.ru/') {
      log(`    canonical: ${seo.canonical}`);
      log(`    og:title:   ${seo.ogTitle}`);
      log(`    og:desc:    ${seo.ogDescription?.slice(0, 80)}…`);
    }

    // Получаем полный HTML страницы (с head-мета-тегами)
    let html = await page.content();

    // Очищаем дублирующиеся теги в <head>, которые возникают из-за
    // react-helmet-async + fallback useEffect в SEOHead.
    // Оставляем только первый <title>, первый canonical, и первые meta с одинаковым name/property.
    html = deduplicateHeadTags(html);

    // Не инлайним весь CSS — внешние таблицы кэшируются браузером на год
    // (заголовок Cache-Control: public, immutable). Инлайн всего CSS раздувает
    // HTML до 300+ KB, что ухудшает LCP при холодном старте.
    // Vite-сборка уже оптимизирует CSS: чанки с хэшами, code splitting.

    // Определяем путь для сохранения
    const savePath =
      route.path === "/"
        ? resolve(DIST, "index.html")
        : resolve(DIST, route.path.slice(1), "index.html");

    mkdirSync(dirname(savePath), { recursive: true });
    writeFileSync(savePath, html, "utf-8");

    log(`    ✅ saved to ${savePath}`);

    return { path: route.path, title: finalTitle, saved: true };
  } catch (err) {
    log(`    ❌ Failed: ${err.message}`);
    return { path: route.path, error: err.message, saved: false };
  } finally {
    await page.close();
    await context.close();
  }
}

async function prerender() {
  // Проверяем, что dist уже существует (сборка уже выполнена)
  if (!existsSync(DIST)) {
    throw new Error("dist/ not found. Run 'npm run build' first, or run this script via the build command.");
  }

  // Проверяем, что index.html — это файл, а не директория (значит dist — результат vite build)
  const distIndex = resolve(DIST, "index.html");
  if (!existsSync(distIndex) || !statSync(distIndex).isFile()) {
    throw new Error("dist/index.html not found. Run 'npm run build' first.");
  }

  // Сохраняем оригинальный SPA-index.html (Vite build) до того, как prerender
  // заменит index.html на главную страницу. Нужен для nginx: если для SPA-роута
  // нет prerender-файла — отдаём spa-index.html вместо index.html (главной).
  const spaIndex = resolve(DIST, "spa-index.html");
  if (!existsSync(spaIndex)) {
    copyFileSync(distIndex, spaIndex);
    log("💾 Saved original SPA index as spa-index.html");
  }

  log("🚀 Start static server…");

  // MIME-типы для статики
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".json": "application/json",
    ".woff2": "font/woff2",
  };

  let server;
  await new Promise((resolveServer) => {
    server = createServer((req, res) => {
      // Проксируем API-запросы на бэкенд — чтобы React Query мог загрузить данные
      // при пререндеринге страниц (тайтлы, описания, OG-мета).
      if (req.url?.startsWith("/api/")) {
        proxyApiRequest(req, res);
        return;
      }

      let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];

      // Пробуем отдать существующий файл
      let diskPath = resolve(DIST, filePath.slice(1));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        const ext = extname(diskPath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(readFileSync(diskPath));
        return;
      }

      // SPA fallback — отдаём index.html для всех маршрутов
      const fallback = resolve(DIST, "index.html");
      if (existsSync(fallback)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(fallback));
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    server.listen(PORT, HOST, () => {
      log(`  Server listening on http://${HOST}:${PORT}`);
      resolveServer();
    });
  });

  const killServer = () => { try { server.close(); } catch {} };

  let browser;
  const results = [];

  try {
    log("🌐 Launch browser…");
    try {
      browser = await chromium.launch({ headless: true });
    } catch (err) {
      log(`⚠️  Cannot launch Chromium: ${err.message}`);
      log("⚠️  Prerender skipped. Run: npx playwright install-deps chromium");
      log("⚠️  The site will still work — SPA fallback is active.");
      // gracefully exit — build succeeded, prerender is optional
      return;
    }

    // Получаем публичные тир-листы, коллекции и темы для prerender'а (если бэкенд доступен)
    await addPublicTierListRoutes();
    await addPublicCollectionRoutes();
    await addTopicRoutes();

    // Параллельная обработка страниц (CONCURRENCY за раз)
    for (let i = 0; i < ROUTES.length; i += CONCURRENCY) {
      const batch = ROUTES.slice(i, i + CONCURRENCY);
      log(`\n📦 Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(ROUTES.length / CONCURRENCY)} (${batch.length} pages)`);

      const batchResults = await Promise.all(
        batch.map((route) => processRoute(browser, route)),
      );
      results.push(...batchResults);
    }
  } finally {
    if (browser) await browser.close();
    killServer();
  }

  log("");
  log("═══════════════════════════════════");
  log("📊 Prerender results:");
  for (const r of results) {
    const icon = r.saved ? "✅" : "❌";
    log(`  ${icon} ${r.path} ${r.title ? `— "${r.title}"` : ""}`);
  }
  log("═══════════════════════════════════");
}

/*
// Когда коллекции будут готовы — раскомментировать и добавить их маршруты:
// import { getCollectionRoutes } from "./getCollectionRoutes.mjs";
//
// async function addCollectionRoutes(routes) {
//   try {
//     const collectionRoutes = await getCollectionRoutes();
//     routes.push(...collectionRoutes);
//   } catch (err) {
//     console.warn("[prerender] Не удалось загрузить маршруты коллекций:", err.message);
//   }
// }
*/

prerender().catch((err) => {
  console.error("[prerender] Fatal:", err);
  process.exit(1);
});
