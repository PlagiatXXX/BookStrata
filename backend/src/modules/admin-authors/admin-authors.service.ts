// backend/src/modules/admin-authors/admin-authors.service.ts
// Ручной контент страницы автора: чтение и атомарная запись (одна транзакция)
import type { PrismaClient } from "@prisma/client";
import type { AuthorContentInput } from "./admin-authors.schema.js";

export type AdminAuthorErrorCode = "author_not_found" | "books_not_owned";

export class AdminAuthorError extends Error {
  constructor(public readonly code: AdminAuthorErrorCode, message: string) {
    super(message);
    this.name = "AdminAuthorError";
  }
}

export interface AdminAuthorListItem {
  id: number;
  name: string;
  slug: string | null;
  statsCount: number;
  showcaseCount: number;
  adaptationsCount: number;
  pressQuotesCount: number;
}

export interface AdminAuthorContent {
  heroImageUrl: string | null;
  badge: string | null;
  motto: string | null;
  manifestoQuote: string | null;
  manifestoAuthor: string | null;
  manifestoRole: string | null;
  aboutText: string | null;
  stats: { value: string; label: string }[];
  showcase: { bookId: number; title: string; pullQuote: string | null }[];
  adaptations: {
    kind: "film" | "theatre" | "tv";
    title: string;
    meta: string | null;
    description: string | null;
    url: string | null;
  }[];
  pressQuotes: { quote: string; source: string; sourceRole: string | null }[];
}

export function createAdminAuthorService(prisma: PrismaClient) {
  /** Список авторов для админки, с флагами наличия контента. */
  const list = async (q?: string): Promise<AdminAuthorListItem[]> => {
    const trimmed = q?.trim();
    const authors = await prisma.author.findMany({
      where: trimmed ? { name: { contains: trimmed, mode: "insensitive" } } : undefined,
      // Популярные (больше книг) — выше, при равенстве — по алфавиту
      orderBy: [{ books: { _count: "desc" } }, { name: "asc" }],
      take: 100,
      include: {
        _count: { select: { stats: true, showcase: true, adaptations: true, pressQuotes: true } },
      },
    });
    return authors.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      statsCount: a._count.stats,
      showcaseCount: a._count.showcase,
      adaptationsCount: a._count.adaptations,
      pressQuotesCount: a._count.pressQuotes,
    }));
  };

  /** Текущий контент автора для редактора. */
  const getContent = async (id: number): Promise<AdminAuthorContent> => {
    const author = await prisma.author.findUnique({
      where: { id },
      include: {
        stats: { orderBy: { order: "asc" } },
        showcase: { orderBy: { order: "asc" }, include: { book: { select: { id: true, title: true } } } },
        adaptations: { orderBy: { order: "asc" } },
        pressQuotes: { orderBy: { order: "asc" } },
      },
    });
    if (!author) throw new AdminAuthorError("author_not_found", "Автор не найден");

    return {
      heroImageUrl: author.heroImageUrl,
      badge: author.badge,
      motto: author.motto,
      manifestoQuote: author.manifestoQuote,
      manifestoAuthor: author.manifestoAuthor,
      manifestoRole: author.manifestoRole,
      aboutText: author.aboutText,
      stats: author.stats.map((s) => ({ value: s.value, label: s.label })),
      showcase: author.showcase.map((s) => ({
        bookId: s.bookId,
        title: s.book.title,
        pullQuote: s.pullQuote,
      })),
      adaptations: author.adaptations.map((a) => ({
        kind: a.kind, title: a.title, meta: a.meta, description: a.description, url: a.url,
      })),
      pressQuotes: author.pressQuotes.map((q) => ({
        quote: q.quote, source: q.source, sourceRole: q.sourceRole,
      })),
    };
  };

  /**
   * Атомарная запись всего контента: поля author + пересоздание 4 списков.
   * Книги showcase проверяются на принадлежность автору до транзакции.
   */
  const saveContent = async (id: number, input: AuthorContentInput): Promise<void> => {
    if (input.showcase.length > 0) {
      const bookIds = input.showcase.map((s) => s.bookId);
      const owned = await prisma.book.findMany({
        where: { id: { in: bookIds }, authorId: id },
        select: { id: true },
      });
      if (owned.length !== new Set(bookIds).size) {
        throw new AdminAuthorError("books_not_owned", "Книги showcase не принадлежат автору");
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.author.update({
          where: { id },
          data: {
            heroImageUrl: input.heroImageUrl,
            badge: input.badge,
            motto: input.motto,
            manifestoQuote: input.manifestoQuote,
            manifestoAuthor: input.manifestoAuthor,
            manifestoRole: input.manifestoRole,
            aboutText: input.aboutText,
          },
        });

        await tx.authorStat.deleteMany({ where: { authorId: id } });
        if (input.stats.length > 0) {
          await tx.authorStat.createMany({
            data: input.stats.map((s, i) => ({ ...s, authorId: id, order: i })),
          });
        }

        await tx.authorShowcase.deleteMany({ where: { authorId: id } });
        if (input.showcase.length > 0) {
          await tx.authorShowcase.createMany({
            data: input.showcase.map((s, i) => ({
              bookId: s.bookId, pullQuote: s.pullQuote, authorId: id, order: i,
            })),
          });
        }

        await tx.authorAdaptation.deleteMany({ where: { authorId: id } });
        if (input.adaptations.length > 0) {
          await tx.authorAdaptation.createMany({
            data: input.adaptations.map((a, i) => ({ ...a, authorId: id, order: i })),
          });
        }

        await tx.authorPressQuote.deleteMany({ where: { authorId: id } });
        if (input.pressQuotes.length > 0) {
          await tx.authorPressQuote.createMany({
            data: input.pressQuotes.map((q, i) => ({ ...q, authorId: id, order: i })),
          });
        }
      });
    } catch (error) {
      // P2025: update не нашёл автора
      if (error && typeof error === "object" && (error as { code?: string }).code === "P2025") {
        throw new AdminAuthorError("author_not_found", "Автор не найден");
      }
      throw error;
    }
  };

  return { list, getContent, saveContent };
}

export type AdminAuthorService = ReturnType<typeof createAdminAuthorService>;
