import { prisma } from "../../lib/prisma.js";

import { config } from "../../config/env.js";

const SITE_URL = config.CLIENT_URL;

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
    { url: `${SITE_URL}/rankings`, priority: "0.8", changefreq: "daily" },
    { url: `${SITE_URL}/community`, priority: "0.6", changefreq: "weekly" },
    { url: `${SITE_URL}/forum`, priority: "0.6", changefreq: "weekly" },
    { url: `${SITE_URL}/what-to-read`, priority: "0.8", changefreq: "weekly" },
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

  // Коллекции — опционально: таблицы может не быть в тестовой БД
  let collections: { slug: string; updatedAt: Date }[] = [];
  try {
    collections = await prisma.collection.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { order: "asc" },
      take: 200,
    });
  } catch {
    // таблица collections ещё не создана — пропускаем
  }

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

  const collectionUrls = collections.map((c) =>
    xmlTag(
      `${SITE_URL}/collections/${c.slug}`,
      "0.7",
      "weekly",
      c.updatedAt.toISOString().split("T")[0],
    ),
  );

  // Уникальные категории из коллекций для /topics/
  let topicCategoryIds: string[] = [];
  try {
    const catRecords = await prisma.collection.findMany({
      where: { isPublished: true, categoryId: { not: null } },
      select: { categoryId: true },
      distinct: ["categoryId"],
    });
    topicCategoryIds = catRecords
      .map((c) => c.categoryId)
      .filter((id): id is string => !!id)
      .sort();
  } catch {
    // таблица collections ещё не создана
  }

  const topicUrls = topicCategoryIds.map((catId) =>
    xmlTag(
      `${SITE_URL}/topics/${encodeURIComponent(catId)}`,
      "0.6",
      "weekly",
    ),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages.map((p) => xmlTag(p.url, p.priority, p.changefreq)), ...newsUrls, ...tierListUrls, ...collectionUrls, ...topicUrls].join("\n")}
</urlset>`;
}
