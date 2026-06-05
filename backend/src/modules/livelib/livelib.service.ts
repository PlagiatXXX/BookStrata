import * as cheerio from "cheerio";
import { createLogger } from "../../lib/logger.js";
import { getFromCache, setToCache } from "../../lib/cache.js";
import type { BookSearchResult } from "../books/books.service.js";

const logger = createLogger("LiveLib", { color: "magenta" });

const LIVELIB_BASE = "https://www.livelib.ru";
const CACHE_TTL = 300;

export interface LiveLibBookRaw {
  title: string;
  author: string;
  coverImageUrl: string | null;
  liveLibUrl: string;
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

async function fetchWithRetry(
  url: string,
  maxAttempts = 2,
): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        logger.info(`LiveLib ответил ${response.status} для ${url}`);
        return response;
      }

      // 404 — пользователь не найден, не ретраим
      if (response.status === 404) {
        throw new Error("Пользователь не найден на LiveLib");
      }

      logger.warn(
        `LiveLib ответил ${response.status} (попытка ${attempt}/${maxAttempts})`,
        { url },
      );
    } catch (err) {
      if ((err as Error).message === "Пользователь не найден на LiveLib") {
        throw err;
      }
      logger.warn(
        `Ошибка соединения с LiveLib (попытка ${attempt}/${maxAttempts}): ${(err as Error).message}`,
        { url },
      );
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("LiveLib вернул ошибку");
}

export function extractBooksFromHtml(html: string): LiveLibBookRaw[] {
  const $ = cheerio.load(html);

  const books: LiveLibBookRaw[] = [];

  // Основной селектор — список прочитанного / поисковая выдача
  $(".object-wrapper.object-edition").each((_, el) => {
    const $el = $(el);

    const title = $el.find(".brow-title a.title").text().trim();
    if (!title) return;

    const author = $el.find("a.description").first().text().trim();
    const coverStyle = $el.find(".object-cover").attr("style") || "";
    const coverMatch = coverStyle.match(/url\(([^)]+)\)/);
    const coverImageUrl = coverMatch ? (coverMatch[1] ?? null) : null;
    const liveLibUrl =
      $el.find(".ll-redirect").attr("data-link") ||
      $el.find(".brow-title a.title").attr("href") ||
      "";

    books.push({ title, author, coverImageUrl, liveLibUrl });
  });

  // Альтернативный селектор — карусель на профиле (wishlist и т.д.)
  if (books.length === 0) {
    $("li.slide-book__item").each((_, el) => {
      const $el = $(el);

      const title = $el.find("a.slide-book__title").text().trim();
      if (!title) return;

      const author = $el.find("a.slide-book__author").text().trim();
      const coverImg = $el.find(".slide-book__link img");
      const coverImageUrl = coverImg.attr("data-pagespeed-lazy-src") || null;
      const liveLibUrl =
        $el.find(".slide-book__link").attr("href") ||
        $el.find("a.slide-book__title").attr("href") ||
        "";

      books.push({ title, author, coverImageUrl, liveLibUrl });
    });
  }

  return books;
}

/**
 * Загрузка книг пользователя из его списков на LiveLib.
 * Сначала пробует /read (прочитанное), затем /wish (хочу прочитать).
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

  // Сначала проверяем, существует ли пользователь, и загружаем профиль
  let profileHtml: string | null = null;
  try {
    const profileUrl = `${LIVELIB_BASE}/reader/${encodeURIComponent(username)}`;
    const profileResp = await fetchWithRetry(profileUrl);
    profileHtml = await profileResp.text();
    const profileTitle = profileHtml.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    if (profileTitle.includes("Страница не найдена") || profileTitle.includes("Ошибка 404")) {
      throw new Error("Пользователь не найден на LiveLib");
    }
  } catch (err) {
    if ((err as Error).message === "Пользователь не найден на LiveLib") {
      throw err;
    }
    // Если не смогли загрузить профиль — пробуем списки
    logger.warn(
      `Не удалось проверить профиль "${username}", пробуем списки`,
    );
  }

  // Пробуем оба списка: read (прочитанное) и wish (хочу прочитать)
  const lists = ["read", "wish"];

  for (const list of lists) {
    const url = `${LIVELIB_BASE}/reader/${encodeURIComponent(username)}/${list}`;
    logger.info(`Fetching LiveLib list: ${url}`);

    let html: string;
    try {
      const response = await fetchWithRetry(url);
      html = await response.text();
    } catch (err) {
      logger.warn(`Не удалось загрузить ${list} для "${username}"`, {
        error: (err as Error).message,
      });
      if (list === lists[lists.length - 1]) {
        break; // вместо throw — даём шанс профилю
      }
      continue;
    }

    const rawBooks = extractBooksFromHtml(html);

    if (rawBooks.length === 0) {
      logger.info(`Список ${list} пуст для "${username}"`);
      continue;
    }

    const results: BookSearchResult[] = rawBooks.map((b) => ({
      openLibraryKey: `livelib:${b.liveLibUrl}`,
      title: b.title,
      author: b.author || "Неизвестен",
      coverUrl: b.coverImageUrl,
      coverUrlLarge: b.coverImageUrl,
    }));

    await setToCache(cacheKey, results, CACHE_TTL);
    logger.info(
      `Загружено ${results.length} книг из списка "${list}" для "${username}"`,
    );
    return results;
  }

  // Если списки пусты или недоступны — пробуем вытащить книги из карусели на профиле
  if (profileHtml) {
    const rawBooks = extractBooksFromHtml(profileHtml);
    if (rawBooks.length > 0) {
      const results: BookSearchResult[] = rawBooks.map((b) => ({
        openLibraryKey: `livelib:${b.liveLibUrl}`,
        title: b.title,
        author: b.author || "Неизвестен",
        coverUrl: b.coverImageUrl,
        coverUrlLarge: b.coverImageUrl,
      }));

      await setToCache(cacheKey, results, CACHE_TTL);
      logger.info(
        `Загружено ${results.length} книг из профиля "${username}" (карусель)`,
      );
      return results;
    }
  }

  return [];
}

