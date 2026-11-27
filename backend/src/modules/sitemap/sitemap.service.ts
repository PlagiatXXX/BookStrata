import { prisma } from "../../lib/prisma.js";

import { config } from "../../config/env.js";
import {
  countMeaningfulPlacedBooks,
  isTierListIndexable,
  type PlacedBookSeoItem,
} from "../tier-lists/tierListSeoFilter.js";

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
    { url: `${SITE_URL}/collections`, priority: "0.8", changefreq: "weekly" },
    { url: `${SITE_URL}/reading-dna`, priority: "0.8", changefreq: "weekly" },
    { url: `${SITE_URL}/community`, priority: "0.6", changefreq: "weekly" },
    { url: `${SITE_URL}/forum`, priority: "0.6", changefreq: "weekly" },
    { url: `${SITE_URL}/what-to-read`, priority: "0.8", changefreq: "weekly" },
    { url: `${SITE_URL}/about`, priority: "0.7", changefreq: "monthly" },
    { url: `${SITE_URL}/faq`, priority: "0.5", changefreq: "monthly" },
    { url: `${SITE_URL}/pricing`, priority: "0.7", changefreq: "monthly" },
    { url: `${SITE_URL}/contact`, priority: "0.5", changefreq: "monthly" },
    { url: `${SITE_URL}/blog`, priority: "0.7", changefreq: "weekly" },
    { url: `${SITE_URL}/blog/why-not-goodreads`, priority: "0.6", changefreq: "monthly" },
    { url: `${SITE_URL}/blog/ssr-without-nextjs`, priority: "0.6", changefreq: "monthly" },
    { url: `${SITE_URL}/blog/kakoy-ya-chitatel`, priority: "0.7", changefreq: "monthly" },
    { url: `${SITE_URL}/blog/matematika-chitatelskogo-dnk`, priority: "0.6", changefreq: "monthly" },
    { url: `${SITE_URL}/celebrities`, priority: "0.7", changefreq: "weekly" },
    { url: `${SITE_URL}/authors`, priority: "0.7", changefreq: "weekly" },
    { url: `${SITE_URL}/privacy`, priority: "0.3", changefreq: "yearly" },
    { url: `${SITE_URL}/terms`, priority: "0.3", changefreq: "yearly" },
    { url: `${SITE_URL}/copyright`, priority: "0.3", changefreq: "yearly" },
  ];

  const [newsArticles, tierLists] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 500,
    }),
    prisma.tierList.findMany({
      where: {
        isPublic: true,
        placements: { some: { tierId: { not: null } } },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        updatedAt: true,
        placements: {
          select: {
            tierId: true,
            thoughts: true,
            book: {
              select: {
                title: true,
                author: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
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
      take: 500,
    });
  } catch {
    // таблица collections ещё не создана — пропускаем
  }

  // Знаменитости — опционально: таблицы может не быть в тестовой БД
  let celebrities: { slug: string; updatedAt: Date }[] = [];
  try {
    celebrities = await prisma.celebrity.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { order: "asc" },
      take: 500,
    });
  } catch {
    // таблица celebrities ещё не создана — пропускаем
  }

  // Авторы — со slug и хотя бы одной опубликованной каталоговой книгой
  // (описание в метах — фолбэк; пустых авторов без книг в sitemap не отдаём)
  let authors: { slug: string; updatedAt: Date }[] = [];
  try {
    const authorRecords = await prisma.author.findMany({
      where: {
        slug: { not: null },
        books: { some: { status: "published", userId: null } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    });
    authors = authorRecords.filter(
      (a): a is { slug: string; updatedAt: Date } => !!a.slug,
    );
  } catch {
    // таблица authors ещё не создана — пропускаем
  }

  // Циклы книг — только с ≥2 опубликованными каталоговыми книгами (защита от thin content)
  let seriesList: { slug: string; updatedAt: Date }[] = [];
  try {
    const seriesRecords = await prisma.series.findMany({
      where: {
        books: { some: { status: "published", userId: null, mergedIntoId: null } },
      },
      select: {
        slug: true,
        updatedAt: true,
        books: {
          where: { status: "published", userId: null, mergedIntoId: null },
          select: { id: true },
          take: 2,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    });
    seriesList = seriesRecords
      .filter((s) => s.books.length >= 2)
      .map((s) => ({ slug: s.slug, updatedAt: s.updatedAt }));
  } catch {
    // таблица series ещё не создана — пропускаем
  }

  const newsUrls = newsArticles.map((a) =>
    xmlTag(
      `${SITE_URL}/news/${a.id}`,
      "0.6",
      "weekly",
      a.updatedAt.toISOString().split("T")[0],
    ),
  );

  // Исключаем тонкие (< 5 осмысленных расставленных книг) и неинформативные тир-листы от thin content
  const tierListUrls = tierLists
    .filter((t) => {
      const placements = (t as { placements?: PlacedBookSeoItem[] }).placements ?? [];
      const placed = placements.filter((p) => p.tierId !== null);
      const hasThoughts = placed.some((p) => Boolean(p.thoughts?.trim()));
      const placedBooksCount = countMeaningfulPlacedBooks(placed);
      return isTierListIndexable({
        isPublic: true,
        title: t.title,
        description: t.description,
        placedBooksCount,
        hasThoughts,
      });
    })
    .map((t) => {
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

  const celebrityUrls = celebrities.map((c) =>
    xmlTag(
      `${SITE_URL}/celebrities/${c.slug}`,
      "0.6",
      "weekly",
      c.updatedAt.toISOString().split("T")[0],
    ),
  );

  const authorUrls = authors.map((a) =>
    xmlTag(
      `${SITE_URL}/authors/${a.slug}`,
      "0.7",
      "weekly",
      a.updatedAt.toISOString().split("T")[0],
    ),
  );

  const seriesUrls = seriesList.map((s) =>
    xmlTag(
      `${SITE_URL}/series/${s.slug}`,
      "0.7",
      "weekly",
      s.updatedAt.toISOString().split("T")[0],
    ),
  );

  // Книги каталога — только published (Фаза 6): slug обязателен (страница /books/:slug)
  // Лимит 45 000: протокол sitemap допускает 50 000 URL на файл, остальные ~600 URL
  // (статика, авторы, коллекции, тир-листы) оставляют запас. Без лимита 1000 новые
  // книги выпадали из карты сайта при росте каталога.
  let books: { slug: string; updatedAt: Date }[] = [];
  try {
    const bookRecords = await prisma.book.findMany({
      where: { status: "published", slug: { not: null }, mergedIntoId: null },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "asc" },
      take: 45000,
    });
    books = bookRecords
      .filter((b): b is { slug: string; updatedAt: Date } => !!b.slug)
      .map((b) => ({ slug: b.slug as string, updatedAt: b.updatedAt }));
  } catch {
    // таблица books ещё не создана — пропускаем
  }

  const bookUrls = books.map((b) =>
    xmlTag(
      `${SITE_URL}/books/${b.slug}`,
      "0.7",
      "weekly",
      b.updatedAt.toISOString().split("T")[0],
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
${[...staticPages.map((p) => xmlTag(p.url, p.priority, p.changefreq)), ...newsUrls, ...tierListUrls, ...collectionUrls, ...celebrityUrls, ...authorUrls, ...seriesUrls, ...bookUrls, ...topicUrls].join("\n")}
</urlset>`;
}
