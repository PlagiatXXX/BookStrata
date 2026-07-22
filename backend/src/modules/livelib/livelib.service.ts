import * as cheerio from "cheerio";
import { createLogger } from "../../lib/logger.js";
import { getFromCache, setToCache } from "../../lib/cache.js";
import type { BookSearchResult } from "../books/books.service.js";

const logger = createLogger("LiveLib", { color: "magenta" });

const LIVELIB_BASE = "https://www.livelib.ru";
const CACHE_TTL = 300;
const MAX_PAGES_PER_LIST = 30; // до ~600 книг на список

/**
 * @deprecated LiveLib перешёл на Next.js SPA — данные больше не в HTML.
 * Оставлено для обратной совместимости тестов.
 */
export interface LiveLibBookRaw {
  title: string;
  author: string;
  coverImageUrl: string | null;
  liveLibUrl: string;
}

/**
 * @deprecated LiveLib перешёл на Next.js SPA — используется RSC payload.
 * Оставлено для обратной совместимости тестов.
 */
export function extractBooksFromHtml(html: string): LiveLibBookRaw[] {
  const $ = cheerio.load(html);

  const books: LiveLibBookRaw[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractCover($el: cheerio.Cheerio<any>): string | null {
    const $img = $el.find("img");
    const pagespeedLazy = $img.attr("data-pagespeed-lazy-src");
    if (pagespeedLazy) return pagespeedLazy;
    const dataSrc = $img.attr("data-src");
    if (dataSrc) return dataSrc;
    const style = $el.attr("style") || "";
    const match = style.match(/url\(([^)]+)\)/);
    if (match?.[1]) return match[1];
    const src = $img.attr("src");
    if (src && !src.startsWith("/pagespeed_static/")) return src;
    return null;
  }

  $(".object-wrapper.object-edition").each((_, el) => {
    const $el = $(el);
    const title = $el.find(".brow-title a.title").text().trim();
    if (!title) return;
    const author = $el.find("a.description").first().text().trim();
    const coverImageUrl = extractCover($el.find(".object-cover"));
    const liveLibUrl =
      $el.find(".ll-redirect").attr("data-link") ||
      $el.find(".brow-title a.title").attr("href") ||
      "";
    books.push({ title, author, coverImageUrl, liveLibUrl });
  });

  if (books.length === 0) {
    $("li.slide-book__item").each((_, el) => {
      const $el = $(el);
      const title = $el.find("a.slide-book__title").text().trim();
      if (!title) return;
      const author = $el.find("a.slide-book__author").text().trim();
      const $coverImg = $el.find(".slide-book__link");
      const coverImageUrl = extractCover($coverImg);
      const liveLibUrl =
        $el.find(".slide-book__link").attr("href") ||
        $el.find("a.slide-book__title").attr("href") ||
        "";
      books.push({ title, author, coverImageUrl, liveLibUrl });
    });
  }

  return books;
}

/** Реалистичные браузерные заголовки, чтобы LiveLib не блокировал */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "https://www.livelib.ru/",
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * Строит корректный Next-Router-State-Tree для страницы коллекции пользователя.
 * Next.js использует это дерево для определения, какой кусок страницы отрендерить.
 */
function makeRscStateTree(
  userId: number,
  collectionType: string,
): string {
  const tree = [
    "",
    {
      children: [
        "users",
        {
          children: [
            String(userId),
            {
              children: [
                "books",
                {
                  children: [
                    collectionType,
                    { children: ["__PAGE__", {}] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
  return encodeURIComponent(JSON.stringify(tree));
}

/** Заголовки для RSC-запроса к Next.js App Router */
function makeRscHeaders(
  userId: number,
  collectionType: string,
): Record<string, string> {
  return {
    ...BROWSER_HEADERS,
    RSC: "1",
    Accept: "*/*",
    "Next-Router-State-Tree": makeRscStateTree(userId, collectionType),
  };
}

/**
 * Извлекает все art_edition объекты из RSC-текста.
 * Проходит по всему тексту, находит сбалансированные JSON-объекты,
 * содержащие "art_edition", и собирает их.
 */
function extractAllBooksFromRsc(rscText: string): LiveLibApiBook[] {
  const books: LiveLibApiBook[] = [];
  const searchKey = '"art_edition":{';
  let pos = 0;

  while ((pos = rscText.indexOf(searchKey, pos)) !== -1) {
    // Ищем `{` перед `"art_edition"` — начало объекта книги
    let bookStart = pos;
    while (bookStart >= 0) {
      if (rscText[bookStart] === "{") break;
      bookStart--;
    }
    if (bookStart < 0) { pos += searchKey.length; continue; }

    const parentObj = extractBalanced(rscText, bookStart);
    if (!parentObj) { pos += searchKey.length; continue; }

    try {
      const parsed = JSON.parse(parentObj) as LiveLibApiBook;
      if (parsed.art_edition?.title) {
        books.push(parsed);
      }
    } catch {
      // невалидный объект — пропускаем
    }
    pos = bookStart + parentObj.length;
  }

  return books;
}

/**
 * Извлекает userId из редиректа /reader/{username} → /users/{userId}
 */
async function resolveUserId(username: string): Promise<number> {
  const url = `${LIVELIB_BASE}/reader/${encodeURIComponent(username)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: "HEAD",
        headers: BROWSER_HEADERS,
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timeout);

      const location = response.headers.get("location") || "";
      const match = location.match(/\/users\/(\d+)/);
      if (match) {
        logger.info(
          `Пользователь "${username}" → userId ${match[1]}`,
        );
        return Number(match[1]);
      }

      // Если редиректа нет — проверяем тело ответа
      if (response.ok) {
        const body = await response.text();
        const bodyMatch = body.match(/\/users\/(\d+)/);
        if (bodyMatch) return Number(bodyMatch[1]);
      }

      if (response.status === 404) {
        throw new Error("Пользователь не найден на LiveLib");
      }
    } catch (err) {
      if ((err as Error).message === "Пользователь не найден на LiveLib") {
        throw err;
      }
      logger.warn(
        `Ошибка при получении userId (попытка ${attempt}): ${(err as Error).message}`,
      );
    }

    if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Не удалось найти пользователя "${username}" на LiveLib`);
}

interface LiveLibApiBook {
  id: number;
  art_edition: {
    id: number;
    title: string;
    authors: { full_name: string }[];
    cover_url: string;
    url: string;
  };
}

/**
 * Находит сбалансированный JSON-объект или массив в тексте, начиная с позиции openPos.
 * Возвращает найденный фрагмент текста и позицию закрывающего символа.
 */
function extractBalanced(text: string, openPos: number): string | null {
  if (openPos >= text.length) return null;
  const openChar = text[openPos];
  const closeChar = openChar === "{" ? "}" : openChar === "[" ? "]" : null;
  if (!closeChar) return null;

  let depth = 1;
  let i = openPos + 1;
  let inString = false;

  while (i < text.length && depth > 0) {
    const ch = text[i]!;
    if (inString) {
      if (ch === "\\") i++; // skip escaped
      else if (ch === '"') inString = false;
    } else {
      if (ch === '"') inString = true;
      else if (ch === openChar) depth++;
      else if (ch === closeChar) depth--;
    }
    i++;
  }

  return depth === 0 ? text.slice(openPos, i) : null;
}

/**
 * Загружает одну страницу списка книг через RSC payload.
 * Страница кодируется через ?page=N.
 */
async function fetchRscListPage(
  userId: number,
  list: string,
  page: number,
): Promise<LiveLibApiBook[]> {
  const collectionType = list === "read" ? "read" : "wish";
  const baseUrl = `${LIVELIB_BASE}/users/${userId}/books/${collectionType}`;
  const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
  logger.info(`Fetching LiveLib RSC: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      headers: makeRscHeaders(userId, collectionType),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(`Список ${list} не найден для userId ${userId}`);
        return [];
      }
      logger.warn(`RSC запрос вернул ${response.status} для ${url}`);
      return [];
    }

    const text = await response.text();
    return extractAllBooksFromRsc(text);
  } catch (err) {
    clearTimeout(timeout);
    logger.warn(
      `Ошибка при загрузке RSC списка ${list}: ${(err as Error).message}`,
    );
    return [];
  }
}

/**
 * Загружает все страницы одного списка (read / wish) для пользователя.
 * Страницы запрашиваются последовательно, чтобы не нагружать LiveLib.
 * Дубликаты (из React Query cache) отфильтровываются по art_edition.url.
 */
async function fetchListWithPagination(
  userId: number,
  list: string,
): Promise<BookSearchResult[]> {
  const seenUrls = new Set<string>();
  const allBooks: BookSearchResult[] = [];

  for (let page = 1; page <= MAX_PAGES_PER_LIST; page++) {
    const apiBooks = await fetchRscListPage(userId, list, page);

    if (apiBooks.length === 0) {
      logger.info(
        `Список ${list} закончился на странице ${page} для userId ${userId}`,
      );
      break;
    }

    let newCount = 0;
    for (const b of apiBooks) {
      const key = b.art_edition.url || b.art_edition.title;
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      newCount++;

      const author = b.art_edition.authors
        ?.map((a: { full_name: string }) => a.full_name)
        .join(", ") || "Неизвестен";

      allBooks.push({
        openLibraryKey: `livelib:${b.art_edition.url}`,
        title: b.art_edition.title,
        author,
        coverUrl: b.art_edition.cover_url,
        coverUrlLarge: b.art_edition.cover_url,
      });
    }

    logger.info(
      `Страница ${page} списка ${list}: +${newCount} новых (всего ${allBooks.length})`,
    );

    // Если не появилось новых книг — конец списка
    if (newCount === 0) break;
  }

  return allBooks;
}

/**
 * Загрузка книг пользователя из его списков на LiveLib.
 * Собирает все страницы /read (прочитанное) и /wish (хочу прочитать).
 */
export async function fetchUserBooks(
  username: string,
): Promise<BookSearchResult[]> {
  const cacheKey = `livelib:user:${username.toLowerCase()}`;
  const cached = await getFromCache<BookSearchResult[]>(cacheKey);
  if (cached) {
    logger.info(
      `Cache HIT for LiveLib user "${username}": ${cached.length} books`,
    );
    return cached;
  }

  // Получаем userId через редирект
  const userId = await resolveUserId(username);

  // Собираем книги из обоих списков с пагинацией
  const seenKeys = new Set<string>();
  const allResults: BookSearchResult[] = [];

  for (const list of ["read", "wish"]) {
    const books = await fetchListWithPagination(userId, list);
    for (const b of books) {
      const key = b.openLibraryKey;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      allResults.push(b);
    }
  }

  if (allResults.length > 0) {
    await setToCache(cacheKey, allResults, CACHE_TTL);
  }

  logger.info(
    `Загружено всего ${allResults.length} книг для "${username}"`,
  );
  return allResults;
}

