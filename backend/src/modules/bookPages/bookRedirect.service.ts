// backend/src/modules/bookPages/bookRedirect.service.ts
// Публичный GET /books/:slug (без /api префикса; nginx проксирует /books/* на бэк):
//   1) lookup в BookSlugHistory → 301 на актуальный slug (политика из Фазы 0),
//   2) иначе — пререндеренный HTML книги из dist/ (если файл есть),
//   3) иначе — SEO-фолбэк: spa-каркас с meta-тегами книги (title/description/canonical/OG)
//      из БД — боты и люди получают корректные заголовки уже из стартового HTML,
//      а не после клиентского fetch (требование Фазы 6, seobook.md).
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config/env.js";
import * as fs from "node:fs";
import * as path from "node:path";

export const SAFE_SLUG_RE = /^[a-z0-9-]+$/;

export interface PublishedBookMeta {
  slug: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImageUrl: string;
  ogImageUrl: string | null;
}

/**
 * Slug'и — только [a-z0-9-] (slugify из lib/slug.ts транслитерирует кириллицу).
 * Защита от path traversal при чтении файлов пререндера.
 */
export function isSafeSlug(slug: string): boolean {
  return SAFE_SLUG_RE.test(slug);
}

/**
 * Поиск актуального slug по истории (BookSlugHistory).
 * Возвращает null, если записи нет; slug, если он отличается от запрошенного.
 * Целевая книга должна быть published — иначе 301 в никуда не отдаём.
 */
export async function resolveSlugRedirect(slug: string): Promise<string | null> {
  const history = await prisma.bookSlugHistory.findUnique({
    where: { oldSlug: slug },
    select: {
      book: { select: { slug: true, status: true } },
    },
  });
  const book = history?.book;
  if (!book || book.status !== "published" || !book.slug || book.slug === slug) {
    return null;
  }
  return book.slug;
}

/** Published-книга по актуальному slug (не по истории). */
export async function findPublishedBookBySlug(slug: string): Promise<PublishedBookMeta | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      author: true,
      description: true,
      coverImageUrl: true,
      ogImageUrl: true,
      status: true,
    },
  });
  if (!book || book.status !== "published" || !book.slug) return null;
  return {
    slug: book.slug,
    title: book.title,
    author: book.author,
    description: book.description,
    coverImageUrl: book.coverImageUrl,
    ogImageUrl: book.ogImageUrl,
  };
}

/**
 * Пререндеренный HTML страницы книги: <DIST_DIR>/books/:slug/index.html.
 * Возвращает null, если DIST_DIR не задан или файла нет.
 */
export function getPrerenderedBookPage(slug: string): string | null {
  if (!config.DIST_DIR) return null;
  const file = path.join(config.DIST_DIR, "books", slug, "index.html");
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

/**
 * SEO-фолбэк: берём spa-каркас (<DIST_DIR>/spa-index.html) и подменяем
 * <title> + инжектим meta description/canonical/OG книги. Если каркас
 * недоступен (dev без DIST_DIR) — минимальный standalone HTML с теми же
 * тегами (бот получает корректные метаданные; JS не подключён — только
 * для крайнего случая, на проде dist всегда смонтирован в контейнер).
 */
export function buildSeoFallbackHtml(book: PublishedBookMeta): string {
  const siteUrl = config.CLIENT_URL;
  const pageUrl = `${siteUrl}/books/${book.slug}`;
  const title = book.author ? `${book.title} — ${book.author}: описание и рейтинг` : `${book.title}: описание и рейтинг`;
  const description =
    book.description?.slice(0, 240) ??
    `Книга ${book.title}${book.author ? ` ${book.author}` : ""}: описание, жанр, рейтинг. Найди книги в тир-листах и подборках BookStrata.`;

  // Фолбэк: Google-thumbnails (encrypted-tbn0.gstatic.com) недоступны извне.
  // Используем OG-изображение (1200×630) если есть, иначе — дефолтный OG-image.
  const ogImage = book.ogImageUrl
    ?? (book.coverImageUrl && !book.coverImageUrl.includes("encrypted-tbn0.gstatic.com")
      ? book.coverImageUrl
      : `${siteUrl}/og-landing.webp`);

  const metaTags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${pageUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="robots" content="index, follow" />`,
  ].filter(Boolean).join("\n    ");

  const spaShell = getSpaIndexHtml();
  if (spaShell) {
    // В index.html нет <title> — его ставит на клиенте SEOHead (document.title),
    // поэтому каркас может прийти без <title>: тогда вставляем и title, и metaTags
    // в начало <head>, иначе — title на место старого, metaTags перед </head>.
    if (!/<title>[^<]*<\/title>/.test(spaShell)) {
      const head = `<title>${escapeHtml(title)}</title>\n    ${metaTags}`;
      return spaShell.replace(/<head[^>]*>/, `$&\n    ${head}`);
    }
    const withTitle = spaShell.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    return withTitle.replace(/<\/head>/, `    ${metaTags}\n  </head>`);
  }

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${metaTags}
  </head>
  <body>
    <main style="max-width:720px;margin:80px auto;padding:0 24px;font-family:system-ui,sans-serif">
      <h1>${escapeHtml(book.title)}</h1>
      ${book.author ? `<p>${escapeHtml(book.author)}</p>` : ""}
      ${book.description ? `<p>${escapeHtml(book.description.slice(0, 400))}</p>` : ""}
      <p><a href="/">BookStrata</a></p>
    </main>
  </body>
</html>`;
}

/** HTML «Книга не найдена» со status 404 и noindex (бот не индексирует мусор). */
export function buildNotFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Книга не найдена — BookStrata</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <main style="max-width:720px;margin:80px auto;padding:0 24px;font-family:system-ui,sans-serif">
      <h1>Книга не найдена</h1>
      <p><a href="/">На главную</a></p>
    </main>
  </body>
</html>`;
}

function getSpaIndexHtml(): string | null {
  if (!config.DIST_DIR) return null;
  const file = path.join(config.DIST_DIR, "spa-index.html");
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
