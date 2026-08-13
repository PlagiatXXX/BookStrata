/**
 * Дедупликация каталога книг (Фаза 1.3, seobook.md) — тонкий раннер.
 *
 * Вся логика — в src/modules/books/bookDedupe.service.ts (покрыта unit-тестами):
 *   - группировка только полных дублей ((source, externalId) / точное (title, authorId));
 *   - детерминированный выбор канона;
 *   - перенос связей (placements/ratings/statuses/CollectionBook/CelebrityBook)
 *     с пропуском конфликтов; удаление неканона при отсутствии привязок.
 *
 * Использование:
 *   npm run tsx scripts/dedupe-books.ts -- --dry-run   (только отчёт)
 *   npm run tsx scripts/dedupe-books.ts                (боевой прогон — ТОЛЬКО после dry-run и бэкапа)
 */
import { prisma } from "../src/lib/prisma.js";
import {
  collectDuplicateGroups,
  mergeGroup,
  pickCanon,
} from "../src/modules/books/bookDedupe.service.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const groups = await collectDuplicateGroups();

  console.log(`Найдено групп дублей: ${groups.length}`);
  for (const g of groups) {
    const canon = pickCanon(g.books);
    console.log(`\n[${g.key}]`);
    for (const b of g.books) {
      const marker = b.id === canon.id ? "КАННОН" : "дубль";
      console.log(
        `  ${marker.padEnd(6)} #${b.id} "${b.title}" (authorId=${b.authorId}, placements=${b.placementsCount}, cover=${b.coverImageUrl ? "да" : "нет"})`,
      );
    }
  }

  if (DRY_RUN) {
    console.log("\n─── DRY RUN: ничего не изменено. Проверьте отчёт выше. ───");
    return;
  }

  for (const g of groups) {
    await mergeGroup(g);
  }

  console.log("\nГотово! Дубли склеены.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());