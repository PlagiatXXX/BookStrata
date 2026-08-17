/**
 * Backfill владельцев пользовательских книг (модель «личные книги», решение 18.08).
 *
 * До этой миграции draft-книги из тир-листов были «ничьими» (userId = null):
 *   - внешние (source + externalId) — общий справочник на всех;
 *   - локальные (без внешнего ID) — каждый добавлял свой оригинал.
 *
 * Скрипт назначает владельцев (владелец вхождения — TierList.userId):
 *   - draft с placements из тир-листов ОДНОГО пользователя → userId = он;
 *   - draft с placements НЕСКОЛЬКИХ пользователей → первому достаётся оригинал,
 *     остальным создаются ЛИЧНЫЕ КОПИИ (все поля + userId), их placements
 *     перепривязываются на копии;
 *   - draft без placements и published → не трогаем.
 *
 * Использование: npx tsx scripts/assign-book-owners.ts [--dry-run]
 * --dry-run: изменения выполняются в транзакции и откатываются.
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  // Вхождения «ничьих» draft-книг: владелец — через тир-лист
  const rows = await prisma.bookPlacement.findMany({
    where: { book: { status: "draft", userId: null } },
    select: {
      bookId: true,
      tierList: { select: { userId: true } },
    },
  });

  // Группируем по книге: [bookId] → Set(ownerIds)
  const ownersByBook = new Map<number, Set<number>>();
  for (const row of rows) {
    const set = ownersByBook.get(row.bookId) ?? new Set<number>();
    set.add(row.tierList.userId);
    ownersByBook.set(row.bookId, set);
  }

  let assigned = 0;
  let copied = 0;

  // В dry-run транзакция откатывается сигналом в конце (иначе коммит)
  const rollbackSignal = new Error("dry-run: откат изменений");
  try {
    await prisma.$transaction(async (tx) => {
      for (const [bookId, ownerSet] of ownersByBook) {
        const ownerIds = Array.from(ownerSet);
        const firstOwner = ownerIds[0]!;

        if (ownerIds.length === 1) {
          // Один владелец → просто назначаем
          await tx.book.update({
            where: { id: bookId },
            data: { userId: firstOwner },
          });
          assigned++;
          continue;
        }

        // Несколько владельцев: первому — оригинал, остальным — личные копии
        await tx.book.update({
          where: { id: bookId },
          data: { userId: firstOwner },
        });
        assigned++;

        const source = await tx.book.findUniqueOrThrow({ where: { id: bookId } });

        for (const ownerId of ownerIds.slice(1)) {
          const copy = await tx.book.create({
            data: {
              title: source.title,
              author: source.author,
              authorId: source.authorId,
              coverImageUrl: source.coverImageUrl,
              description: source.description,
              genre: source.genre,
              tags: source.tags,
              publishedYear: source.publishedYear,
              externalId: source.externalId,
              source: source.source,
              status: source.status,
              mergedIntoId: source.mergedIntoId,
              rating: source.rating,
              likesCount: source.likesCount,
              // Копия — личная: владелец, без slug и контекста (своя история)
              userId: ownerId,
              slug: null,
              contextChain: (source.contextChain ?? Prisma.DbNull) as Prisma.InputJsonValue,
            },
          });
          // Перепривязываем placements этого владельца на копию
          const affected = await tx.bookPlacement.updateMany({
            where: { bookId, tierList: { userId: ownerId } },
            data: { bookId: copy.id },
          });
          copied++;
          console.log(
            `книга #${bookId} → копия #${copy.id} для user ${ownerId} (${affected.count} placements)`,
          );
        }
      }

      if (DRY_RUN) throw rollbackSignal;
    });
  } catch (error) {
    if (error !== rollbackSignal) throw error;
  }

  console.log(
    `Готово: назначено владельцев — ${assigned}, создано копий — ${copied}` +
      `${DRY_RUN ? " (dry-run, откачено)" : ""}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());