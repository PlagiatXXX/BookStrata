import { prisma } from "../../lib/prisma.js";

const SITE_URL = process.env.CLIENT_URL || "https://bookstrata.ru";

function xmlTag(url: string, priority: string, changefreq: string, lastmod?: string): string {
  return `  <url>
    <loc>${url}</loc>
    <priority>${priority}</priority>
    <changefreq>${changefreq}</changefreq>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

export async function generateSitemap(): Promise<string> {
  const staticPages = [
    { url: `${SITE_URL}/`, priority: "1.0", changefreq: "weekly" },
    { url: `${SITE_URL}/about`, priority: "0.7", changefreq: "monthly" },
    { url: `${SITE_URL}/pricing`, priority: "0.7", changefreq: "monthly" },
    { url: `${SITE_URL}/contact`, priority: "0.5", changefreq: "monthly" },
    { url: `${SITE_URL}/privacy`, priority: "0.3", changefreq: "yearly" },
    { url: `${SITE_URL}/terms`, priority: "0.3", changefreq: "yearly" },
  ];

  const [newsArticles, tierLists] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 500,
    }),
    prisma.tierList.findMany({
      where: { isPublic: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { likesCount: "desc" },
      take: 1000,
    }),
  ]);

  const newsUrls = newsArticles.map((a) =>
    xmlTag(
      `${SITE_URL}/news/${a.id}`,
      "0.6",
      "weekly",
      a.updatedAt.toISOString().split("T")[0],
    ),
  );

  const tierListUrls = tierLists.map((t) => {
    const path = t.slug ? `/tier-lists/${t.slug}` : `/tier-lists/${t.id}`;
    return xmlTag(
      `${SITE_URL}${path}`,
      "0.6",
      "weekly",
      t.updatedAt.toISOString().split("T")[0],
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages.map((p) => xmlTag(p.url, p.priority, p.changefreq)), ...newsUrls, ...tierListUrls].join("\n")}
</urlset>`;
}
