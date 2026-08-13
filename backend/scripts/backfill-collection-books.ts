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
 *   3. не найдено → создаём Book.
 *
 * Полнота (строгий порог Фазы 0): title+author+genre+tags+description+cover+publishedYear
 * → published, иначе draft. Поле year в карточках появится после правок редактора
 * (Фаза 2.3 структуры изменений) — сейчас карточки без года, книги уйдут в draft.
 *
 * Эталонные поля (жанр/теги/описание) карточка перезаписывает в каталоге.
 * rating карточки — в CollectionBook.rating, в Book.rating НЕ пишется.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
): Promise<number | null> {
  const normAuthor = normalizeAuthor(card.author);
  const authorId = authorRegistry.get(normAuthor) ?? null;

  // 1. По authorId (автор резолвнут)
  if (authorId !== null) {
    const byAuthor = await prisma.book.findFirst({
      where: { title: { equals: card.title, mode: "insensitive" }, authorId },
      select: { id: true },
    });
    if (byAuthor) return byAuthor.id;
  }

  // 2. По нормализованной строке автора
  if (normAuthor) {
    const byString = await prisma.book.findMany({
      where: { title: { equals: card.title, mode: "insensitive" } },
      select: { id: true, author: true },
    });
    const exact = byString.find(
      (b) => b.author && normalizeAuthor(b.author) === normAuthor,
    );
    if (exact) return exact.id;
  }

  // 3. Книги без автора — только по точному title и ровно один кандидат
  if (!card.author) {
    const candidates = await prisma.book.findMany({
      where: { title: { equals: card.title, mode: "insensitive" } },
      select: { id: true },
    });
    const first = candidates[0];
    if (candidates.length === 1 && first) return first.id;
  }

  return null;
}

async function buildAuthorRegistry(): Promise<Map<string, number | null>> {
  const registry = new Map<string, number | null>();
  const authors = await prisma.author.findMany({
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
): Promise<number> {
  const existingId = await matchBook(card, authorRegistry);

  if (existingId) {
    // Карточка — эталон: перезаписываем genre/tags/description (Фаза 0), НЕ title/author/cover
    if (card.genre || card.tags?.length || card.description) {
      await prisma.book.update({
        where: { id: existingId },
        data: {
          ...(card.genre ? { genre: card.genre } : {}),
          ...(card.tags?.length ? { tags: card.tags } : {}),
          ...(card.description ? { description: card.description } : {}),
        },
      });
    }
    return existingId;
  }

  const complete = isComplete(card);
  let created: { id: number };
  try {
    created = await prisma.book.create({
      data: {
        title: card.title,
        author: card.author || null,
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
      const candidates = await prisma.book.findMany({
        where: { title: { equals: card.title, mode: "insensitive" } },
        select: { id: true, author: true },
      });
      // Единственный кандидат по названию — это канон (автор пишется по-разному:
      // «Лев Толстой» vs «Толстой Лев Николаевич» — издательские расхождения)
      let canon = candidates.length === 1 ? candidates[0] : undefined;
      if (!canon) {
        canon = candidates.find(
          (b) => b.author && normalizeAuthor(b.author) === normalizeAuthor(card.author),
        );
      }
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

async function main() {
  const authorRegistry = await buildAuthorRegistry();

  const collections = await prisma.collection.findMany({
    select: { id: true, title: true, books: true },
  });

  const celebrities = await prisma.celebrity.findMany({
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
      const bookId = await processCard(card, index, authorRegistry);
      await prisma.collectionBook.upsert({
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
      const bookId = await processCard(card, index, authorRegistry);
      await prisma.celebrityBook.upsert({
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());