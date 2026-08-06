// backend/scripts/migrate-external-covers.ts
// Переводит ВСЕ внешние обложки (Amazon, LiveLib, Google, wikimedia и т.д.)
// на наш S3/CDN. Проходит по коллекциям (books JSON, bookCovers,
// coverImageUrl), знаменитостям (books JSON, photoUrl) и книгам Book.
//
// Идемпотентен: повторный запуск не создаёт дублей — кэш по хэшу URL.
//
// Запуск:
//   cd backend
//   npx tsx scripts/migrate-external-covers.ts            # обычный режим
//   npx tsx scripts/migrate-external-covers.ts --dry-run  # только отчёт
//   npx tsx scripts/migrate-external-covers.ts --verbose  # детальный лог

import { PrismaClient, Prisma } from "@prisma/client";
import {
  migrateBookCovers,
  migrateUrlToCdn,
  migrateUrlsArray,
} from "../src/lib/external-covers.js";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

type BookRecord = { coverImageUrl?: string; [key: string]: unknown };

function log(msg: string) {
  console.log(msg);
}
function detail(msg: string) {
  if (VERBOSE) console.log("  " + msg);
}

async function migrateCollections() {
  const collections = await prisma.collection.findMany({
    select: { id: true, slug: true, coverImageUrl: true, bookCovers: true, books: true },
  });

  let changed = 0;
  for (const c of collections) {
    const updates: Prisma.CollectionUpdateInput = {};

    // 1. coverImageUrl коллекции
    const cover = c.coverImageUrl ? await migrateUrlToCdn(c.coverImageUrl) : "";
    if (cover !== c.coverImageUrl) {
      updates.coverImageUrl = cover;
      detail(`collection ${c.slug}: coverImageUrl → ${cover}`);
    }

    // 2. bookCovers (массив)
    if (c.bookCovers.length) {
      const newCovers = await migrateUrlsArray(c.bookCovers);
      const changedCovers = c.bookCovers.filter((u, i) => u !== newCovers[i]).length;
      if (changedCovers > 0) {
        updates.bookCovers = newCovers;
        detail(`collection ${c.slug}: ${changedCovers}/${c.bookCovers.length} bookCovers`);
      }
    }

    // 3. books (JSON: Record<string, Book>)
    if (c.books && typeof c.books === "object" && !Array.isArray(c.books)) {
      const books = c.books as Record<string, BookRecord>;
      const newBooks = await migrateBookCovers(books);
      const changedBooks = Object.keys(books).filter(
        (id) => books[id]?.coverImageUrl !== newBooks[id]?.coverImageUrl,
      ).length;
      if (changedBooks > 0) {
        updates.books = newBooks as unknown as Prisma.InputJsonValue;
        detail(`collection ${c.slug}: ${changedBooks}/${Object.keys(books).length} books`);
      }
    }

    if (Object.keys(updates).length > 0) {
      changed++;
      if (!DRY_RUN) {
        await prisma.collection.update({ where: { id: c.id }, data: updates });
      }
    }
  }

  log(`Коллекции: обработано ${collections.length}, изменено ${changed}${DRY_RUN ? " (dry-run)" : ""}`);
}

async function migrateCelebrities() {
  const celebrities = await prisma.celebrity.findMany({
    select: { id: true, slug: true, photoUrl: true, books: true },
  });

  let changed = 0;
  for (const c of celebrities) {
    const updates: Prisma.CelebrityUpdateInput = {};

    const photo = c.photoUrl ? await migrateUrlToCdn(c.photoUrl) : "";
    if (photo !== c.photoUrl) {
      updates.photoUrl = photo;
      detail(`celebrity ${c.slug}: photoUrl → ${photo}`);
    }

    if (c.books && typeof c.books === "object" && !Array.isArray(c.books)) {
      const books = c.books as Record<string, BookRecord>;
      const newBooks = await migrateBookCovers(books);
      const changedBooks = Object.keys(books).filter(
        (id) => books[id]?.coverImageUrl !== newBooks[id]?.coverImageUrl,
      ).length;
      if (changedBooks > 0) {
        updates.books = newBooks as unknown as Prisma.InputJsonValue;
        detail(`celebrity ${c.slug}: ${changedBooks}/${Object.keys(books).length} books`);
      }
    }

    if (Object.keys(updates).length > 0) {
      changed++;
      if (!DRY_RUN) {
        await prisma.celebrity.update({ where: { id: c.id }, data: updates });
      }
    }
  }

  log(`Знаменитости: обработано ${celebrities.length}, изменено ${changed}${DRY_RUN ? " (dry-run)" : ""}`);
}

async function migrateBooks() {
  const books = await prisma.book.findMany({
    select: { id: true, coverImageUrl: true },
  });

  let changed = 0;
  for (const b of books) {
    if (!b.coverImageUrl) continue;
    const newUrl = await migrateUrlToCdn(b.coverImageUrl);
    if (newUrl !== b.coverImageUrl) {
      changed++;
      detail(`book ${b.id}: → ${newUrl}`);
      if (!DRY_RUN) {
        await prisma.book.update({ where: { id: b.id }, data: { coverImageUrl: newUrl } });
      }
    }
  }

  log(`Книги: обработано ${books.length}, изменено ${changed}${DRY_RUN ? " (dry-run)" : ""}`);
}

async function main() {
  log(DRY_RUN ? "=== DRY-RUN: изменения не сохраняются ===" : "=== Миграция внешних обложек на CDN ===");
  await migrateCollections();
  await migrateCelebrities();
  await migrateBooks();
  log("Готово!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
