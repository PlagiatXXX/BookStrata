// backend/src/modules/tier-lists/tierListRedirect.service.ts
// Сервис публичного роута GET /tier-lists/:slug (nginx проксирует сюда при отсутствии статического пререндера):
//   1) если запрошен по UUID, но есть красивый slug → 301 редирект на канонический URL,
//   2) если не существует в БД → 404 HTML с <meta name="robots" content="noindex" />,
//   3) если приватный (isPublic: false) или 0 книг → spa-каркас с <meta name="robots" content="noindex, nofollow" />,
//   4) если пререндерен на диске → готовый HTML из dist/tier-lists/:slug/index.html,
//   5) иначе → SEO-фолбэк (подстановка title/description/canonical/OG в spa-каркас из БД).
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config/env.js";
import * as fs from "node:fs";
import * as path from "node:path";

export const SAFE_SLUG_RE = /^[a-z0-9-]+$/;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TierListMeta {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  isPublic: boolean;
  coverImageUrl: string | null;
  booksCount: number;
  user: {
    username: string;
  } | null;
}

/**
 * Проверка slug на безопасность (только [a-z0-9-]).
 * Защита от path traversal при чтении файлов пререндера.
 */
export function isSafeSlug(slug: string): boolean {
  return SAFE_SLUG_RE.test(slug);
}

/**
 * Проверка, является ли строка UUID идентификатором.
 */
export function isUuid(str: string): boolean {
  return UUID_RE.test(str);
}

/**
 * Поиск тир-листа в БД по slug или id (UUID).
 */
export async function findTierListBySlugOrId(
  slugOrId: string,
): Promise<TierListMeta | null> {
  const where = isUuid(slugOrId)
    ? { OR: [{ id: slugOrId }, { slug: slugOrId }] }
    : { slug: slugOrId };

  const tierList = await prisma.tierList.findFirst({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      isPublic: true,
      coverImageUrl: true,
      user: {
        select: {
          username: true,
        },
      },
      _count: {
        select: {
          placements: true,
        },
      },
    },
  });

  if (!tierList) return null;

  return {
    id: tierList.id,
    slug: tierList.slug,
    title: tierList.title,
    description: tierList.description,
    isPublic: tierList.isPublic,
    coverImageUrl: tierList.coverImageUrl,
    booksCount: tierList._count?.placements ?? 0,
    user: tierList.user,
  };
}

/**
 * Пререндеренный HTML страницы тир-листа: <DIST_DIR>/tier-lists/:slug/index.html.
 */
export function getPrerenderedTierListPage(slug: string): string | null {
  if (!config.DIST_DIR) return null;
  const file = path.join(config.DIST_DIR, "tier-lists", slug, "index.html");
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Чтение базового SPA-каркаса (<DIST_DIR>/spa-index.html).
 */
export function getSpaIndexHtml(): string | null {
  if (!config.DIST_DIR) return null;
  const file = path.join(config.DIST_DIR, "spa-index.html");
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

/**
 * HTML «Тир-лист не найден» со статусом 404 и тегом noindex.
 * Робот Google видит честный статус 404 и исключает URL из базы вместо Soft 404.
 */
export function buildNotFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Тир-лист не найден — BookStrata</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <main style="max-width:720px;margin:80px auto;padding:0 24px;font-family:system-ui,sans-serif">
      <h1>Тир-лист не найден</h1>
      <p>Возможно, он был удалён автором или перенесён по другому адресу.</p>
      <p><a href="/templates">Все тир-листы</a> • <a href="/">На главную</a></p>
    </main>
  </body>
</html>`;
}

/**
 * SPA-каркас с принудительным мета-тегом noindex, nofollow для приватных
 * или пустых тир-листов. Владелец в браузере загружает SPA и работает с ним,
 * но поисковые роботы страницу не индексируют.
 */
export function buildPrivateOrEmptyTierListHtml(): string {
  const spaShell = getSpaIndexHtml();
  const noindexTag = `<meta name="robots" content="noindex, nofollow" />`;

  if (spaShell) {
    if (spaShell.includes('name="robots"')) {
      return spaShell.replace(/<meta\s+name=["']robots["'][^>]*>/i, noindexTag);
    }
    return spaShell.replace(/<head[^>]*>/i, `$&\n    ${noindexTag}`);
  }

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Тир-лист — BookStrata</title>
    ${noindexTag}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

/**
 * SEO-фолбэк: подстановка title, description, canonical и Open Graph мета-тегов
 * в spa-каркас из БД для непререндеренных публичных тир-листов с книгами.
 */
export function buildTierListSeoFallbackHtml(tierList: TierListMeta): string {
  const siteUrl = config.CLIENT_URL;
  const canonicalSlug = tierList.slug || tierList.id;
  const pageUrl = `${siteUrl}/tier-lists/${canonicalSlug}`;
  const author = tierList.user?.username;
  const count = tierList.booksCount;

  let title = tierList.title;
  if (count > 0 && author) {
    title = `${tierList.title} — книжный тир-лист из ${count} книг от ${author} | BookStrata`;
  } else if (author) {
    title = `${tierList.title} — книжный тир-лист от ${author} | BookStrata`;
  } else {
    title = `${tierList.title} — книжный тир-лист | BookStrata`;
  }

  const description =
    tierList.description?.slice(0, 240) ??
    `Тир-лист «${tierList.title}»${author ? ` от ${author}` : ""}: визуальный рейтинг книг на BookStrata.`;

  const ogImage =
    tierList.coverImageUrl &&
    !tierList.coverImageUrl.includes("encrypted-tbn0.gstatic.com")
      ? tierList.coverImageUrl
      : `${siteUrl}/og-landing.webp`;

  const metaTags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${pageUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta name="robots" content="index, follow" />`,
  ].join("\n    ");

  const spaShell = getSpaIndexHtml();
  if (spaShell) {
    if (!/<title>[^<]*<\/title>/.test(spaShell)) {
      const head = `<title>${escapeHtml(title)}</title>\n    ${metaTags}`;
      return spaShell.replace(/<head[^>]*>/, `$&\n    ${head}`);
    }
    const withTitle = spaShell.replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
    );
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
      <h1>${escapeHtml(tierList.title)}</h1>
      ${author ? `<p>Автор: ${escapeHtml(author)}</p>` : ""}
      <p>${escapeHtml(description)}</p>
      <p><a href="/">BookStrata</a></p>
    </main>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
