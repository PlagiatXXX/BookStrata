/**
 * Backfill карточек коллекций/знаменитостей → каталог (Фаза 1.5, seobook.md).
 *
 * JSON-снимки Collections.books / Celebrity.books (Record<string, CuratedBook>)
 * связываются с каталогом через реляционные CollectionBook / CelebrityBook
 * (решение 12.08). JSON-снимки остаются legacy-источником отображения,
 * read-путь страницы книги — SQL JOIN без JSON-path.
 *
 * Матчинг (консервативный, без fuzzy — fuzzy только в runtime-матчинге Фазы 2):
 *   1. точное (normalized title, authorId) — если автор уже в реестре;
 *   2. точное (normalized title, normalized authorString) — fallback;
 *   3. не найдено → создаём Book (с резолвом автора через findOrCreate).
 *
 * Полнота (строгий порог Фазы 0): title+author+genre+tags+description+cover+publishedYear
 * → published, иначе draft. Поле year в карточках появится после правок редактора
 * (Фаза 2.3 структуры изменений) — сейчас карточки без года, книги уйдут в draft.
 *
 * Эталонные поля (жанр/теги/описание) карточка перезаписывает в каталоге.
 * rating карточки — в CollectionBook.rating, в Book.rating НЕ пишется.
 *
 * --dry-run: ВСЁ выполняется в одной транзакции, в конце — откат (rollback).
 * Реальные записи в БД не остаются.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { createAuthorService } from "../src/modules/authors/authors.service.js";

type Db = PrismaClient | Prisma.TransactionClient;

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

/** Сигнал отката dry-run-транзакции (Prisma rollback при брошенном исключении). */
class RollbackSignal extends Error {}

function normalizeAuthor(name: string): string {
  return name.toLowerCase().trim().replace(/ё/g, "е").replace(/\s+/g, " ");
}

interface CuratedBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  description?: string;
  rating?: number;
  genre?: string;
  tags?: string[];
  year?: number;
  tierId?: string | null;
}

/** Строгий порог публикации (решение 13.08): год обязателен. */
function isComplete(book: CuratedBook): boolean {
  return Boolean(
    book.title &&
      book.author &&
      book.genre &&
      Array.isArray(book.tags) &&
      book.tags.length > 0 &&
      book.description &&
      book.coverImageUrl &&
      book.year,
  );
}

async function matchBook(
  card: CuratedBook,
  authorRegistry: Map<string, number | null>,
  db: Db,
): Promise<{ id: number; authorId: number | null } | null> {
  const normAuthor = normalizeAuthor(card.author);
  const authorId = authorRegistry.get(normAuthor) ?? null;

  // 1. По authorId (автор резолвнут)
  if (authorId !== null) {
    const byAuthor = await db.book.findFirst({
      where: { title: { equals: card.title, mode: "insensitive" }, authorId },
      select: { id: true, authorId: true },
    });
    if (byAuthor) return { id: byAuthor.id, authorId: byAuthor.authorId };
  }

  // 2. По нормализованной строке автора
  if (normAuthor) {
    const byString = await db.book.findMany({
      where: { title: { equals: card.title, mode: "insensitive" } },
      select: { id: true, author: true, authorId: true },
    });
    const exact = byString.find(
      (b) => b.author && normalizeAuthor(b.author) === normAuthor,
    );
    if (exact) return { id: exact.id, authorId: exact.authorId };
  }

  // 3. Книги без автора — только по точному title и ровно один кандидат
  if (!card.author) {
    const candidates = await db.book.findMany({
      where: { title: { equals: card.title, mode: "insensitive" } },
      select: { id: true, authorId: true },
    });
    const first = candidates[0];
    if (candidates.length === 1 && first) {
      return { id: first.id, authorId: first.authorId };
    }
  }

  return null;
}

async function buildAuthorRegistry(db: Db): Promise<Map<string, number | null>> {
  const registry = new Map<string, number | null>();
  const authors = await db.author.findMany({
    select: { id: true, name: true },
  });
  for (const a of authors) {
    registry.set(normalizeAuthor(a.name), a.id);
  }
  return registry;
}

async function processCard(
  card: CuratedBook,
  rank: number,
  authorRegistry: Map<string, number | null>,
  authorService: ReturnType<typeof createAuthorService>,
  db: Db,
): Promise<number> {
  const existingId = await matchBook(card, authorRegistry, db);

  if (existingId) {
    // Карточка — эталон: перезаписываем genre/tags/description (Фаза 0), НЕ title/author/cover
    const updates: Record<string, unknown> = {};
    if (card.genre) updates.genre = card.genre;
    if (card.tags?.length) updates.tags = card.tags;
    if (card.description) updates.description = card.description;

    // Долечивание authorId у книг, созданных старым скриптом (без автора):
    // матч по строке автора есть, а FK не проставлен — проставляем.
    const normAuthor = normalizeAuthor(card.author);
    const authorId = authorRegistry.get(normAuthor) ?? null;
    if (authorId !== null && existingId.authorId === null) {
      updates.authorId = authorId;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await db.book.update({ where: { id: existingId.id }, data: updates });
      } catch (error) {
        // P2002 на (title, authorId) — значит, рядом уже есть книга с тем же
        // названием и автором (канон). Склейка — отдельная задача (dedupe).
        if ((error as { code?: string })?.code === "P2002") {
          console.log(`  ⚠ долечивание authorId #${existingId.id} пропущено (дубль)`);
        } else {
          throw error;
        }
      }
    }
    return existingId.id;
  }

  // Автор: резолвим через findOrCreate (та же логика, что в рантайме) —
  // книги из коллекций получают authorId, а не NULL (books_local_identity_idx).
  let authorId: number | null = null;
  if (card.author) {
    const normAuthor = normalizeAuthor(card.author);
    if (authorRegistry.has(normAuthor)) {
      authorId = authorRegistry.get(normAuthor)!;
    } else {
      const author = await authorService.findOrCreate(card.author);
      authorRegistry.set(normAuthor, author.id);
      authorId = author.id;
    }
  }

  const complete = isComplete(card);
  let created: { id: number };
  try {
    created = await db.book.create({
      data: {
        title: card.title,
        author: card.author || null,
        authorId,
        coverImageUrl: card.coverImageUrl || "",
        description: card.description ?? null,
        genre: card.genre ?? null,
        tags: Array.isArray(card.tags) ? card.tags : [],
        publishedYear: card.year ?? null,
        status: complete ? "published" : "draft",
        publishedAt: complete ? new Date() : null,
      },
    });
  } catch (error) {
    // P2002 на partial unique index (books_local_identity_idx) — канон уже существует,
    // гонку выиграл конкурентный INSERT. Retry: перезапрос канона → link (Фаза 2.1).
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2002") {
      const candidates = await db.book.findMany({
        where: { title: { equals: card.title, mode: "insensitive" } },
        select: { id: true, author: true, authorId: true },
      });
      // Приоритет: автор уже резолвнут → ищем по authorId; иначе по строке автора
      // (пишется по-разному: «Лев Толстой» vs «Толстой Лев Николаевич»);
      // иначе единственный кандидат по названию.
      let canon = authorId !== null
        ? candidates.find((b) => b.authorId === authorId)
        : undefined;
      if (!canon) {
        canon = candidates.find(
          (b) => b.author && normalizeAuthor(b.author) === normalizeAuthor(card.author),
        );
      }
      if (!canon && candidates.length === 1) canon = candidates[0];
      if (!canon) throw error;
      console.log(`  ⇄ P2002-retry: link #${canon.id} ${card.title}`);
      return canon.id;
    }
    throw error;
  }

  if (complete) {
    console.log(`  ✦ СОЗДАНА published: #${created.id} ${card.title}`);
  } else {
    console.log(`  ✎ создана draft (неполная карточка): #${created.id} ${card.title}`);
  }
  return created.id;
}

async function runAll(db: Db): Promise<void> {
  const authorRegistry = await buildAuthorRegistry(db);
  const authorService = createAuthorService(db as unknown as PrismaClient);

  const collections = await db.collection.findMany({
    select: { id: true, title: true, books: true },
  });

  const celebrities = await db.celebrity.findMany({
    select: { id: true, name: true, books: true },
  });

  let linkedCollections = 0;
  let linkedCelebrities = 0;

  // ——— Коллекции ———
  for (const collection of collections) {
    const cards = (collection.books ?? {}) as unknown as Record<string, CuratedBook>;
    if (!cards || typeof cards !== "object" || Array.isArray(cards)) continue;
    const entries = Object.values(cards).filter(
      (c) => c && typeof c === "object" && c.title,
    );
    if (entries.length === 0) continue;

    for (const [index, card] of entries.entries()) {
      const bookId = await processCard(card, index, authorRegistry, authorService, db);
      await db.collectionBook.upsert({
        where: {
          collectionId_bookId: { collectionId: collection.id, bookId },
        },
        create: {
          collectionId: collection.id,
          bookId,
          tierId: card.tierId ?? null,
          rank: index,
          rating: card.rating ?? null,
        },
        update: {},
      });
      linkedCollections++;
    }
    console.log(`✓ Коллекция #${collection.id} «${collection.title}»: ${entries.length} карточек`);
  }

  // ——— Знаменитости ———
  for (const celebrity of celebrities) {
    const cards = (celebrity.books ?? {}) as unknown as Record<string, CuratedBook>;
    if (!cards || typeof cards !== "object" || Array.isArray(cards)) continue;
    const entries = Object.values(cards).filter(
      (c) => c && typeof c === "object" && c.title,
    );
    if (entries.length === 0) continue;

    for (const [index, card] of entries.entries()) {
      const bookId = await processCard(card, index, authorRegistry, authorService, db);
      await db.celebrityBook.upsert({
        where: {
          celebrityId_bookId: { celebrityId: celebrity.id, bookId },
        },
        create: {
          celebrityId: celebrity.id,
          bookId,
          tierId: card.tierId ?? null,
          rank: index,
          rating: card.rating ?? null,
        },
        update: {},
      });
      linkedCelebrities++;
    }
    console.log(`✓ Знаменитость #${celebrity.id} «${celebrity.name}»: ${entries.length} карточек`);
  }

  console.log(`\nГотово! Связей CollectionBook: ${linkedCollections}, CelebrityBook: ${linkedCelebrities}`);

  if (DRY_RUN) throw new RollbackSignal();
}

async function main() {
  if (DRY_RUN) {
    try {
      await prisma.$transaction(async (tx) => {
        await runAll(tx);
      });
      console.log("\n(dry-run: транзакция завершилась без отката — что-то пошло не так)");
    } catch (error) {
      if (error instanceof RollbackSignal) {
        console.log("(dry-run: изменения откачены, в БД ничего не записано)");
        return;
      }
      throw error;
    }
  } else {
    await runAll(prisma);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());