// backend/scripts/migrate-media-urls.ts
// Переводит URL изображений в БД на собственный домен (MEDIA_PUBLIC_URL):
// заменяет старые адреса бакета (raw-S3 и CDN) — запускается после отказа от CDN.
//
// Идемпотентен: строки без старых префиксов (внешние обложки, локальные пути,
// уже новые URL) остаются как есть.
//
// Запуск:
//   cd backend
//   npx tsx scripts/migrate-media-urls.ts            # записывает изменения
//   npx tsx scripts/migrate-media-urls.ts --dry-run  # только отчёт
//   npx tsx scripts/migrate-media-urls.ts --verbose  # детальный лог

import { PrismaClient, Prisma } from "@prisma/client";
import { config } from "../src/config/env.js";
import { rewriteMediaUrl, rewriteMediaUrlsInJson } from "../src/lib/media-url-rewrite.js";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

function log(msg: string) {
  console.log(msg);
}
function detail(msg: string) {
  if (VERBOSE) console.log("  " + msg);
}

/** Новое значение простого строкового поля или null, если менять нечего. */
function rewriteField(value: string | null | undefined): string | null {
  if (!value) return null;
  const next = rewriteMediaUrl(value);
  return next === value ? null : next;
}

/** Новое значение JSON-поля или null, если менять нечего. */
function rewriteJsonField(
  value: Prisma.JsonValue | null,
): { data: Prisma.InputJsonValue; changed: number } | null {
  if (value === null) return null;
  const [next, changed] = rewriteMediaUrlsInJson(value);
  if (changed === 0) return null;
  return { data: next as Prisma.InputJsonValue, changed };
}

async function migrateBooks() {
  const rows = await prisma.book.findMany({
    select: { id: true, coverImageUrl: true, ogImageUrl: true },
  });

  let changed = 0;
  for (const row of rows) {
    const data: Prisma.BookUpdateInput = {};

    const cover = rewriteField(row.coverImageUrl);
    if (cover) {
      data.coverImageUrl = cover;
      detail(`book ${row.id}: coverImageUrl → ${cover}`);
    }
    const og = rewriteField(row.ogImageUrl);
    if (og) {
      data.ogImageUrl = og;
      detail(`book ${row.id}: ogImageUrl → ${og}`);
    }

    if (Object.keys(data).length === 0) continue;
    changed++;
    if (!DRY_RUN) await prisma.book.update({ where: { id: row.id }, data });
  }

  log(`Книги: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateCollections() {
  const rows = await prisma.collection.findMany({
    select: { id: true, slug: true, coverImageUrl: true, bookCovers: true, books: true, tiers: true },
  });

  let changed = 0;
  for (const row of rows) {
    const data: Prisma.CollectionUpdateInput = {};

    const cover = rewriteField(row.coverImageUrl);
    if (cover) {
      data.coverImageUrl = cover;
      detail(`collection ${row.slug}: coverImageUrl → ${cover}`);
    }

    const covers = row.bookCovers.map(rewriteMediaUrl);
    if (covers.some((url, i) => url !== row.bookCovers[i])) {
      data.bookCovers = covers;
      detail(`collection ${row.slug}: bookCovers (${covers.length})`);
    }

    const books = rewriteJsonField(row.books);
    if (books) {
      data.books = books.data;
      detail(`collection ${row.slug}: books — ${books.changed} URL`);
    }

    const tiers = rewriteJsonField(row.tiers);
    if (tiers) {
      data.tiers = tiers.data;
      detail(`collection ${row.slug}: tiers — ${tiers.changed} URL`);
    }

    if (Object.keys(data).length === 0) continue;
    changed++;
    if (!DRY_RUN) await prisma.collection.update({ where: { id: row.id }, data });
  }

  log(`Коллекции: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateCelebrities() {
  const rows = await prisma.celebrity.findMany({
    select: { id: true, slug: true, photoUrl: true, books: true, tiers: true },
  });

  let changed = 0;
  for (const row of rows) {
    const data: Prisma.CelebrityUpdateInput = {};

    const photo = rewriteField(row.photoUrl);
    if (photo) {
      data.photoUrl = photo;
      detail(`celebrity ${row.slug}: photoUrl → ${photo}`);
    }

    const books = rewriteJsonField(row.books);
    if (books) {
      data.books = books.data;
      detail(`celebrity ${row.slug}: books — ${books.changed} URL`);
    }

    const tiers = rewriteJsonField(row.tiers);
    if (tiers) {
      data.tiers = tiers.data;
      detail(`celebrity ${row.slug}: tiers — ${tiers.changed} URL`);
    }

    if (Object.keys(data).length === 0) continue;
    changed++;
    if (!DRY_RUN) await prisma.celebrity.update({ where: { id: row.id }, data });
  }

  log(`Знаменитости: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateTierLists() {
  const rows = await prisma.tierList.findMany({ select: { id: true, coverImageUrl: true } });

  let changed = 0;
  for (const row of rows) {
    const cover = rewriteField(row.coverImageUrl);
    if (!cover) continue;
    changed++;
    detail(`tierList ${row.id}: coverImageUrl → ${cover}`);
    if (!DRY_RUN) {
      await prisma.tierList.update({ where: { id: row.id }, data: { coverImageUrl: cover } });
    }
  }

  log(`Тир-листы: обработано ${rows.length}, изменено ${changed}`);
}

async function migratePlacements() {
  // Составной первичный ключ — адресуем запись парой (tierListId, bookId)
  const rows = await prisma.bookPlacement.findMany({
    select: { tierListId: true, bookId: true, coverImageUrl: true },
  });

  let changed = 0;
  for (const row of rows) {
    const cover = rewriteField(row.coverImageUrl);
    if (!cover) continue;
    changed++;
    detail(`placement ${row.tierListId}/${row.bookId}: coverImageUrl → ${cover}`);
    if (!DRY_RUN) {
      await prisma.bookPlacement.update({
        where: { tierListId_bookId: { tierListId: row.tierListId, bookId: row.bookId } },
        data: { coverImageUrl: cover },
      });
    }
  }

  log(`Размещения книг: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateNews() {
  const rows = await prisma.newsArticle.findMany({ select: { id: true, imageUrl: true } });

  let changed = 0;
  for (const row of rows) {
    const image = rewriteField(row.imageUrl);
    if (!image) continue;
    changed++;
    detail(`news ${row.id}: imageUrl → ${image}`);
    if (!DRY_RUN) {
      await prisma.newsArticle.update({ where: { id: row.id }, data: { imageUrl: image } });
    }
  }

  log(`Новости: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateUsers() {
  const rows = await prisma.user.findMany({ select: { id: true, avatarUrl: true } });

  let changed = 0;
  for (const row of rows) {
    const avatar = rewriteField(row.avatarUrl);
    if (!avatar) continue;
    changed++;
    detail(`user ${row.id}: avatarUrl → ${avatar}`);
    if (!DRY_RUN) {
      await prisma.user.update({ where: { id: row.id }, data: { avatarUrl: avatar } });
    }
  }

  log(`Аватары: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateContentFlags() {
  const rows = await prisma.contentFlag.findMany({ select: { id: true, imageUrl: true } });

  let changed = 0;
  for (const row of rows) {
    const image = rewriteField(row.imageUrl);
    if (!image) continue;
    changed++;
    detail(`contentFlag ${row.id}: imageUrl → ${image}`);
    if (!DRY_RUN) {
      await prisma.contentFlag.update({ where: { id: row.id }, data: { imageUrl: image } });
    }
  }

  log(`Жалобы на контент: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateAuthors() {
  const rows = await prisma.author.findMany({ select: { id: true, slug: true, heroImageUrl: true } });

  let changed = 0;
  for (const row of rows) {
    const hero = rewriteField(row.heroImageUrl);
    if (!hero) continue;
    changed++;
    detail(`author ${row.slug ?? row.id}: heroImageUrl → ${hero}`);
    if (!DRY_RUN) {
      await prisma.author.update({ where: { id: row.id }, data: { heroImageUrl: hero } });
    }
  }

  log(`Авторы: обработано ${rows.length}, изменено ${changed}`);
}

async function migrateTemplates() {
  const rows = await prisma.template.findMany({
    select: { id: true, title: true, defaultBooks: true },
  });

  let changed = 0;
  for (const row of rows) {
    const books = rewriteJsonField(row.defaultBooks);
    if (!books) continue;
    changed++;
    detail(`template ${row.title}: defaultBooks — ${books.changed} URL`);
    if (!DRY_RUN) {
      await prisma.template.update({ where: { id: row.id }, data: { defaultBooks: books.data } });
    }
  }

  log(`Шаблоны: обработано ${rows.length}, изменено ${changed}`);
}

async function main() {
  log(
    DRY_RUN
      ? "=== DRY-RUN: изменения не сохраняются ==="
      : "=== Миграция URL изображений на собственный домен ===",
  );
  log(`Целевой префикс: ${config.MEDIA_PUBLIC_URL}`);

  await migrateBooks();
  await migrateCollections();
  await migrateCelebrities();
  await migrateTierLists();
  await migratePlacements();
  await migrateNews();
  await migrateUsers();
  await migrateContentFlags();
  await migrateAuthors();
  await migrateTemplates();

  log(DRY_RUN ? "Готово (dry-run)." : "Готово!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
