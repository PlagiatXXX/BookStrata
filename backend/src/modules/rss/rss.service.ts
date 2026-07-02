import { prisma } from "../../lib/prisma.js";

const SITE_URL = process.env.CLIENT_URL || "https://bookstrata.ru";
const SITE_NAME = "BookStrata";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date): string {
  return date.toUTCString();
}

function rssItem(item: {
  title: string;
  link: string;
  description: string;
  pubDate: Date;
  guid: string;
  imageUrl?: string | null;
}): string {
  const enclosure = item.imageUrl
    ? `    <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" />\n`
    : "";

  return `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${escapeXml(item.link)}</link>
    <description>${escapeXml(item.description)}</description>
    <pubDate>${formatDate(item.pubDate)}</pubDate>
    <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
${enclosure}  </item>`;
}

export async function generateRssFeed(): Promise<string> {
  const newsArticles = await prisma.newsArticle.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      excerpt: true,
      imageUrl: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  const now = new Date();
  const items = newsArticles.map((article) =>
    rssItem({
      title: article.title,
      link: `${SITE_URL}/news/${article.id}`,
      description: article.excerpt || article.title,
      pubDate: article.publishedAt,
      guid: `${SITE_URL}/news/${article.id}`,
      imageUrl: article.imageUrl,
    }),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Новости книжного рейтинга</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_NAME)} — интерактивный рейтинг книг. Свежие новости, подборки и статьи о книгах.</description>
    <language>ru</language>
    <lastBuildDate>${formatDate(now)}</lastBuildDate>
    <atom:link href="${escapeXml(SITE_URL)}/rss.xml" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;
}
