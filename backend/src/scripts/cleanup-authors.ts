/**
 * Скрипт очистки реестра авторов: удаляет записи, похожие на названия книг,
 * и перерегистрирует реальных авторов из связанных книг.
 *
 * Запуск: npx tsx src/scripts/cleanup-authors.ts
 *
 * Что делает:
 * 1. Находит все записи Author, где name похож на название книги
 * 2. Показывает их списком с количеством связанных книг
 * 3. Удаляет те, у которых нет связанных книг
 * 4. Для остальных — перерегистрирует автора из book.author (findOrCreate),
 *    обновляет authorId в книгах, удаляет старую запись
 */
import { PrismaClient } from '@prisma/client';
import { createAuthorService, looksLikeBookTitle } from '../modules/authors/authors.service.js';

const prisma = new PrismaClient();
const authorService = createAuthorService(prisma);

async function main() {
  console.log('🔍 Ищем подозрительные записи в реестре авторов...\n');

  const allAuthors = await prisma.author.findMany({
    include: { _count: { select: { books: true } } },
    orderBy: { name: 'asc' },
  });

  const suspicious = allAuthors.filter((a) => looksLikeBookTitle(a.name));

  if (suspicious.length === 0) {
    console.log('✅ Подозрительных записей не найдено. Реестр авторов чист!');
    return;
  }

  console.log(`Найдено ${suspicious.length} подозрительных записей:\n`);
  for (const a of suspicious) {
    console.log(`  [${a.id}] "${a.name}" — ${a._count.books} книг(а)`);
  }

  // 1. Удаляем записи без книг — просто чистим
  const toDelete = suspicious.filter((a) => a._count.books === 0);
  if (toDelete.length > 0) {
    await prisma.author.deleteMany({
      where: { id: { in: toDelete.map((a) => a.id) } },
    });
    console.log(`\n🗑️ Удалено ${toDelete.length} записей без книг`);
  }

  // 2. Для записей с книгами — перерегистрируем авторов
  const toReassign = suspicious.filter((a) => a._count.books > 0);
  let reassigned = 0;
  let skipped = 0;

  for (const badAuthor of toReassign) {
    // Загружаем все книги, ссылающиеся на этого «автора»
    const books = await prisma.book.findMany({
      where: { authorId: badAuthor.id },
      select: { id: true, title: true, author: true },
    });

    for (const book of books) {
      if (!book.author?.trim()) {
        // Нет текстового автора — просто отвязываем
        await prisma.book.update({
          where: { id: book.id },
          data: { authorId: null },
        });
        skipped++;
        continue;
      }

      // Регистрируем настоящего автора из строки book.author
      // Если это реальное имя — findOrCreate создаст запись в Author
      // Если это тоже мусор — запишется как есть (на входе не фильтруем)
      try {
        const realAuthor = await authorService.findOrCreate(book.author);
        await prisma.book.update({
          where: { id: book.id },
          data: { authorId: realAuthor.id },
        });
        reassigned++;
      } catch {
        // findOrCreate выбросит ошибку при пустом имени — отвязываем
        await prisma.book.update({
          where: { id: book.id },
          data: { authorId: null },
        });
        skipped++;
      }
    }

    // Удаляем старую запись
    await prisma.author.delete({ where: { id: badAuthor.id } });
    console.log(`🔄 "${badAuthor.name}" → авторы перерегистрированы (${books.length} книг)`);
  }

  console.log(`\n✅ Готово!
  Удалено записей без книг: ${toDelete.length}
  Перерегистрировано книг: ${reassigned}
  Пропущено (без текстового автора): ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
