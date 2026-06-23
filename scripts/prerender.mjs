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
import { Agent } from "undici";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
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

// Dispatcher для fetch() с самоподписанными сертификатами (nginx на localhost).
// NODE_TLS_REJECT_UNAUTHORIZED=0 не работает с undici fetch в Node 18+,
// поэтому явно создаём Agent с rejectUnauthorized: false.
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

// Публичные маршруты для индексации
const ROUTES = [
  { path: "/",           name: "Главная" },
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
      const apiUrl = `${BACKEND_URL}${req.url}`;
      const body = bodyChunks.length > 0 ? Buffer.concat(bodyChunks) : undefined;
      const apiRes = await fetch(apiUrl, {
        method: req.method,
        headers: {
          "content-type": req.headers["content-type"] || "",
          accept: req.headers["accept"] || "application/json",
          "user-agent": req.headers["user-agent"] || "prerender",
        },
        body,
        dispatcher: insecureAgent,
      });
      const responseHeaders = {};
      for (const [key, value] of apiRes.headers.entries()) {
        if (!["content-encoding", "transfer-encoding", "content-length", "connection"].includes(key)) {
          responseHeaders[key] = value;
        }
      }
      const text = await apiRes.text();
      log(`  Proxy: ${req.method} ${req.url} → ${apiRes.status} (${(apiRes.headers.get("content-type") || "no type").split(";")[0]}, ${text.length}B)`);
      send(apiRes.status, responseHeaders, text);
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
    const res = await fetch(`${BACKEND_URL}/api/tier-lists/public?pageSize=50&sortBy=likes`, {
      dispatcher: insecureAgent,
    });
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

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

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

/** Будет установлен в true, если бэкенд доступен во время сборки */
let backendAvailable = false;

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

    server.listen(PORT, "127.0.0.1", () => {
      log(`  Server listening on http://127.0.0.1:${PORT}`);
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

    // Получаем публичные тир-листы для prerender'а (если бэкенд доступен)
    await addPublicTierListRoutes();

    for (const route of ROUTES) {
      log(`  → ${route.path} (${route.name})`);

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      });
      const page = await context.newPage();

      try {
        // Блокируем запросы к API, только если бэкенд недоступен
        if (!backendAvailable) {
          await page.route("**/api/**", (route) => route.abort());
        }
        await page.route("**/sitemap.xml", (route) => route.abort());

        // Перехватываем консольные ошибки (не даём им упасть в reject)
        page.on("pageerror", (err) => {
          log(`  ⚠️  JS error on ${route.path}: ${err.message}`);
        });

        const url = `${BASE}${route.path}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

        // Запоминаем дефолтный title (который выставил App.tsx до загрузки данных)
        const initialTitle = await page.title();

        // Ждём, пока React отрендерит контент (а не спиннер)
        await page.waitForFunction(
          () => {
            const root = document.getElementById("root");
            if (!root) return false;
            const html = root.innerHTML;
            return html.length > 200 && !html.includes("Загрузка...");
          },
          { timeout: 20000 },
        );

        // Для тир-листов: ждём 5 секунд, пока title обновится
        // Если не обновился — генерируем fallback из slug
        if (route.path.startsWith("/tier-lists/")) {
          await page.waitForFunction(
            () => document.title.includes("— книжный тир-лист"),
            { timeout: 5000 },
          ).catch(() => {});
        } else {
          // Для остальных страниц — ждём 5 секунд
          await page.waitForFunction(
            (defaultTitle) => document.title !== defaultTitle,
            initialTitle,
            { timeout: 5000 },
          ).catch(() => {});
        }

        // Небольшая пауза для завершения анимаций
        await page.waitForTimeout(500);

        // Проверяем title — если generic, генерируем из slug
        const currentTitle = await page.title();
        const isTierList = route.path.startsWith("/tier-lists/");
        const needsFallbackTitle = isTierList && !currentTitle.includes("— книжный тир-лист");

        let finalTitle = currentTitle;
        if (needsFallbackTitle) {
          const slug = route.path.replace("/tier-lists/", "");
          const readableTitle = deslugify(slug);
          finalTitle = `${readableTitle} — книжный рейтинг | BookStrata`;
          log(`  ⚡ Fallback title: "${finalTitle}"`);

          // Внедряем title и og:title через evaluate (они попадут в page.content())
          await page.evaluate((t) => {
            document.title = t;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', t);
          }, finalTitle);
        }

        log(`    title: ${finalTitle}`);

        // Логируем SEO-мета-теги
        const seo = await page.evaluate(() => ({
          title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
          ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
          description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        }));
        if (seo.title !== "Рейтинг книг и книжные тир-листы онлайн | BookStrata") {
          log(`    canonical: ${seo.canonical}`);
          log(`    og:title:   ${seo.ogTitle}`);
          log(`    og:desc:    ${seo.ogDescription?.slice(0, 80)}…`);
        }

        // Получаем полный HTML страницы (с head-мета-тегами)
        let html = await page.content();

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

        results.push({ path: route.path, title: finalTitle, saved: true });
      } catch (err) {
        log(`    ❌ Failed: ${err.message}`);
        results.push({ path: route.path, error: err.message, saved: false });
      } finally {
        await page.close();
        await context.close();
      }
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

prerender().catch((err) => {
  console.error("[prerender] Fatal:", err);
  process.exit(1);
});
