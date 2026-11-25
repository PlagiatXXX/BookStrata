import sharp from "sharp";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config/env.js";
import { getSpaIndexHtml } from "../tier-lists/tierListRedirect.service.js";

export const SAFE_TICKET_RE = /^[A-Za-z0-9_-]{3,40}$/;

export interface ReadingDnaOgMeta {
  ticketNumber: string;
  customName: string | null;
  archetypeName: string;
  motto: string | null;
  storyFocus: number;
  emotionalWeight: number;
  pace: number;
  darkness: number;
  scope: number;
  complexity: number;
  updatedAt: Date;
}

const OG_CACHE_MAX = 200;
const ogPngCache = new Map<string, Buffer>();

function setOgCache(key: string, buf: Buffer): void {
  if (ogPngCache.has(key)) {
    ogPngCache.delete(key);
  } else if (ogPngCache.size >= OG_CACHE_MAX) {
    const oldest = ogPngCache.keys().next().value;
    if (oldest !== undefined) ogPngCache.delete(oldest);
  }
  ogPngCache.set(key, buf);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current.length > maxChars ? `${current.slice(0, maxChars - 1)}…` : current);
  }
  return lines;
}

/**
 * Поиск метаданных билета для OG без инкремента viewsCount (боты не накручивают просмотры).
 */
export async function findReadingDnaForOg(
  ticketNumberOrCode: string,
): Promise<ReadingDnaOgMeta | null> {
  if (!SAFE_TICKET_RE.test(ticketNumberOrCode)) return null;
  return prisma.readingDna.findFirst({
    where: {
      OR: [
        { ticketNumber: ticketNumberOrCode },
        { shortCode: ticketNumberOrCode },
      ],
    },
    select: {
      ticketNumber: true,
      customName: true,
      archetypeName: true,
      motto: true,
      storyFocus: true,
      emotionalWeight: true,
      pace: true,
      darkness: true,
      scope: true,
      complexity: true,
      updatedAt: true,
    },
  });
}

/**
 * Генерирует PNG 1200×630 для Open Graph через sharp + SVG (DejaVu Sans/Serif с кириллицей).
 */
export async function generateReadingDnaOgPng(
  ticket: ReadingDnaOgMeta,
  mode: "ticket" | "challenge" = "ticket",
): Promise<Buffer> {
  const cacheKey = `${ticket.ticketNumber}:${mode}:${ticket.updatedAt.getTime()}`;
  const cached = ogPngCache.get(cacheKey);
  if (cached) return cached;

  const badgeText =
    mode === "challenge"
      ? "ВЫЗОВ НА КНИЖНУЮ ДУЭЛЬ"
      : "BOOKSTRATA · КНИЖНЫЙ ДНК";
  const badgeColor = mode === "challenge" ? "#8a2433" : "#4a3319";
  const badgeStroke = mode === "challenge" ? "#e11d48" : "#c9a35b";

  const ownerLine = ticket.customName
    ? `${ticket.customName} · № ${ticket.ticketNumber}`
    : `Билет № ${ticket.ticketNumber}`;

  const titleLines = wrapLines(ticket.archetypeName, 26, 2);
  const mottoText = ticket.motto
    ? `«${ticket.motto.replace(/^[«"']+|[»"']+$/g, "")}»`
    : "Узнай свой читательский архетип и сравни вкус с друзьями";
  const mottoLines = wrapLines(mottoText, 52, 2);

  const axes = [
    { label: "Сюжет / Рефлексия", val: ticket.storyFocus },
    { label: "Эмоциональный вес", val: ticket.emotionalWeight },
    { label: "Темп чтения", val: ticket.pace },
    { label: "Свет / Мрак", val: ticket.darkness },
    { label: "Масштаб мира", val: ticket.scope },
    { label: "Сложность слога", val: ticket.complexity },
  ];

  const axesSvg = axes
    .map((a, idx) => {
      const y = 175 + idx * 58;
      const barW = Math.round((Math.max(0, Math.min(100, a.val)) / 100) * 320);
      return `
        <text x="770" y="${y}" fill="#cbb896" font-family="DejaVu Sans, sans-serif" font-size="18">${escapeXml(a.label)}</text>
        <text x="1090" y="${y}" text-anchor="end" fill="#efe3cc" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="bold">${a.val}</text>
        <rect x="770" y="${y + 12}" width="320" height="10" rx="5" fill="#3a281d" />
        <rect x="770" y="${y + 12}" width="${Math.max(8, barW)}" height="10" rx="5" fill="#c9a35b" />
      `;
    })
    .join("");

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="90" y="${250 + idx * 66}" fill="#f7ecd7" font-family="DejaVu Serif, Georgia, serif" font-size="54" font-weight="bold">${escapeXml(line)}</text>`,
    )
    .join("");

  const mottoStartY = 250 + titleLines.length * 66 + 24;
  const mottoSvg = mottoLines
    .map(
      (line, idx) =>
        `<text x="90" y="${mottoStartY + idx * 34}" fill="#d6c4a5" font-family="DejaVu Serif, Georgia, serif" font-size="24" font-style="italic">${escapeXml(line)}</text>`,
    )
    .join("");

  const ctaText =
    mode === "challenge"
      ? "Пройди тест за 1 минуту и проверь совместимость вкусов →"
      : "Открой свой читательский билет на bookstrata.ru/reading-dna";

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a110c" />
        <stop offset="55%" stop-color="#281a11" />
        <stop offset="100%" stop-color="#140c08" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect x="34" y="34" width="1132" height="562" rx="20" fill="none" stroke="#c9a35b" stroke-opacity="0.45" stroke-width="2" />
    <rect x="46" y="46" width="1108" height="538" rx="14" fill="none" stroke="#c9a35b" stroke-opacity="0.18" stroke-width="1" />

    <!-- Badge -->
    <rect x="90" y="84" width="${mode === "challenge" ? 370 : 350}" height="42" rx="21" fill="${badgeColor}" stroke="${badgeStroke}" stroke-opacity="0.7" stroke-width="1.5" />
    <text x="${mode === "challenge" ? 275 : 265}" y="111" text-anchor="middle" fill="#f7ecd7" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="bold" letter-spacing="1.5">${escapeXml(badgeText)}</text>

    <!-- Owner & Ticket Number -->
    <text x="90" y="168" fill="#c9a35b" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="bold">${escapeXml(ownerLine)}</text>

    <!-- Archetype Title -->
    ${titleSvg}

    <!-- Motto -->
    ${mottoSvg}

    <!-- Vertical Divider -->
    <line x1="730" y1="100" x2="730" y2="520" stroke="#c9a35b" stroke-opacity="0.25" stroke-width="1.5" />

    <!-- Right Column: 6 Axes -->
    <text x="770" y="122" fill="#c9a35b" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="bold" letter-spacing="1.5">ОСИ ВКУСА (0–100)</text>
    ${axesSvg}

    <!-- Footer CTA -->
    <line x1="90" y1="518" x2="690" y2="518" stroke="#c9a35b" stroke-opacity="0.22" stroke-width="1" />
    <text x="90" y="554" fill="#efe3cc" font-family="DejaVu Sans, sans-serif" font-size="20">${escapeXml(ctaText)}</text>
    <text x="1090" y="554" text-anchor="end" fill="#c9a35b" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="bold">bookstrata.ru</text>
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  setOgCache(cacheKey, png);
  return png;
}

/**
 * Строит HTML с динамическими Open Graph метатегами для /reading-dna?ticket=... или ?challenge=...
 * Ставит noindex, follow, чтобы query-ссылки не создавали SEO-дубли базовой страницы /reading-dna.
 */
export function buildReadingDnaOgFallbackHtml(params: {
  ticket: ReadingDnaOgMeta | null;
  mode: "ticket" | "challenge";
  queryParamValue?: string;
}): string {
  const siteUrl = config.CLIENT_URL.replace(/\/$/, "");
  const { ticket, mode, queryParamValue } = params;

  const isChallenge = mode === "challenge";
  const ticketNum = ticket?.ticketNumber || queryParamValue || "";
  const pageUrl = ticketNum
    ? `${siteUrl}/reading-dna?${isChallenge ? "challenge" : "ticket"}=${encodeURIComponent(ticketNum)}`
    : `${siteUrl}/reading-dna`;

  let title: string;
  let description: string;
  let ogImage: string;

  if (ticket) {
    const owner = ticket.customName ? ` (${ticket.customName})` : "";
    if (isChallenge) {
      title = `Вызов на книжную дуэль · Архетип: ${ticket.archetypeName} | BookStrata`;
      description = `Проверь совместимость вкусов с билетом ${ticket.ticketNumber}${owner} — пройди Книжный ДНК за 1 минуту и узнай, совпадёте ли вы по книгам.`;
    } else {
      title = `Книжный паспорт: ${ticket.archetypeName} (${ticket.ticketNumber}) | BookStrata`;
      description = ticket.motto
        ? `Читательский билет ${ticket.ticketNumber}${owner}. «${ticket.motto.replace(/^[«"']+|[»"']+$/g, "")}» — расшифруй свой Книжный ДНК на BookStrata.`
        : `Читательский билет ${ticket.ticketNumber}${owner} — архетип «${ticket.archetypeName}». Узнай свой Книжный ДНК и сравни вкусы с друзьями.`;
    }
    ogImage = `${siteUrl}/api/reading-dna/og/${encodeURIComponent(ticket.ticketNumber)}.png?mode=${mode}`;
  } else {
    title = isChallenge
      ? "Вызов на книжную дуэль — Книжный ДНК | BookStrata"
      : "Книжный ДНК: узнай свой читательский архетип | BookStrata";
    description =
      "Пройдите интерактивный тест по 6 осям вкуса, получите читательский билет с архетипом и сравните вкусы с друзьями на BookStrata.";
    ogImage = `${siteUrl}/og-reading-dna.webp`;
  }

  const metaTags = [
    `<meta name="description" content="${escapeXml(description)}" />`,
    `<link rel="canonical" href="${siteUrl}/reading-dna" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeXml(title)}" />`,
    `<meta property="og:description" content="${escapeXml(description)}" />`,
    `<meta property="og:url" content="${escapeXml(pageUrl)}" />`,
    `<meta property="og:image" content="${escapeXml(ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeXml(title)}" />`,
    `<meta name="twitter:description" content="${escapeXml(description)}" />`,
    `<meta name="twitter:image" content="${escapeXml(ogImage)}" />`,
    `<meta name="robots" content="noindex, follow" />`,
  ].join("\n    ");

  const spaShell = getSpaIndexHtml();
  if (spaShell) {
    const withoutDefaultMeta = spaShell
      .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
      .replace(/<meta\s+property=["']og:(title|description|url|image|image:width|image:height)["'][^>]*>\s*/gi, "")
      .replace(/<meta\s+name=["']twitter:(card|title|description|image)["'][^>]*>\s*/gi, "")
      .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");

    if (!/<title>[^<]*<\/title>/i.test(withoutDefaultMeta)) {
      return withoutDefaultMeta.replace(
        /<head[^>]*>/i,
        `$&\n    <title>${escapeXml(title)}</title>\n    ${metaTags}`,
      );
    }
    return withoutDefaultMeta
      .replace(/<title>[^<]*<\/title>/i, `<title>${escapeXml(title)}</title>`)
      .replace(/<\/head>/i, `    ${metaTags}\n  </head>`);
  }

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeXml(title)}</title>
    ${metaTags}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}
