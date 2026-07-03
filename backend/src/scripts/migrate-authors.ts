/**
 * Скрипт миграции: заполняет authorId для существующих книг.
 *
 * Запуск: npx tsx src/scripts/migrate-authors.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { createAuthorService } from '../modules/authors/authors.service.js';

const prisma = new PrismaClient();
const authorService = createAuthorService(prisma);

async function main() {
  // --- Часть 1: книги из таблицы Book ---
  const books = await prisma.book.findMany({
    where: {
      authorId: null,
      author: { not: null },
    },
    select: { id: true, author: true },
  });

  console.log(`Found ${books.length} books without authorId`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const book of books) {
    if (!book.author?.trim()) {
      skipped++;
      continue;
    }

    try {
      const author = await authorService.findOrCreate(book.author);
      await prisma.book.update({
        where: { id: book.id },
        data: { authorId: author.id },
      });
      updated++;
      if (author.bookCount <= 1) {
        created++;
      }
    } catch (err) {
      console.error(`Error updating book ${book.id} ("${book.author}"):`, err);
      skipped++;
    }
  }

  console.log(`\nBooks: updated=${updated}, new authors=${created}, skipped=${skipped}`);

  // --- Часть 2: авторы из коллекций (JSON-поле books) ---
  console.log('\n--- Processing collections ---');
  const collections = await prisma.collection.findMany({
    where: {
      books: { not: Prisma.DbNull },
    },
    select: { id: true, slug: true, books: true },
  });

  let collectionAuthors = 0;
  for (const col of collections) {
    const booksJson = col.books as Record<string, { author?: string | null}> | null;
    if (!booksJson) continue;

    const authorNames = new Set<string>();
    for (const book of Object.values(booksJson)) {
      if (book.author?.trim()) {
        authorNames.add(book.author.trim());
      }
    }

    for (const name of authorNames) {
      await authorService.findOrCreate(name);
      collectionAuthors++;
    }
  }

  console.log(`Collections: processed ${collections.length}, authors registered: ${collectionAuthors}`);

  // --- Итог ---
  console.log('\nDone!');

  // Выводим топ-10 авторов
  const topAuthors = await prisma.author.findMany({
    orderBy: { books: { _count: 'desc' } },
    take: 10,
    include: { _count: { select: { books: true } } },
  });

  console.log('\nTop authors:');
  for (const a of topAuthors) {
    console.log(`  ${a.name} — ${a._count.books} книг`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
