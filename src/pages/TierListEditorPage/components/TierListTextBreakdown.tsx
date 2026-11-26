import { Link } from "react-router-dom";
import type { Book, TierListData } from "@/types";
import { pluralize } from "@/utils/pluralize";
import { sanitizePublicAuthorName } from "../seo";

interface TierListTextBreakdownProps {
  title: string;
  authorName?: string | null;
  listData: TierListData;
  onViewBook?: (book: Book) => void;
}

interface NonEmptyTierGroup {
  id: string;
  title: string;
  color: string;
  books: Book[];
}

function buildSummarySentence(
  title: string,
  safeAuthor: string | null,
  totalPlaced: number,
  groups: NonEmptyTierGroup[],
): string {
  const authorPart = safeAuthor ? ` от ${safeAuthor}` : "";
  const verb =
    totalPlaced % 10 === 1 && totalPlaced % 100 !== 11
      ? "распределена"
      : "распределено";
  const booksPart = `${verb} ${totalPlaced} ${pluralize(totalPlaced, "книга", "книги", "книг")}`;
  const levelsPart = `по ${groups.length} ${pluralize(groups.length, "уровню", "уровням", "уровням")}`;

  const topGroup = groups[0];
  if (!topGroup || topGroup.books.length === 0) {
    return `В рейтинге «${title}»${authorPart} ${booksPart} ${levelsPart}.`;
  }

  const topPreview = topGroup.books
    .slice(0, 3)
    .map((b) =>
      b.author && b.author !== "Неизвестен" ? `${b.title} (${b.author})` : b.title,
    )
    .join(", ");
  const restCount = topGroup.books.length - 3;
  const restSuffix =
    restCount > 0
      ? ` и ещё ${restCount} ${pluralize(restCount, "книга", "книги", "книг")}`
      : "";

  return `В рейтинге «${title}»${authorPart} ${booksPart} ${levelsPart}. В уровень «${topGroup.title}» вошли: ${topPreview}${restSuffix}.`;
}

/**
 * Текстовая расшифровка публичного тир-листа для читателей и поисковых систем:
 * сводка по рейтингу, список книг по уровням со ссылками на /books/:slug и мыслями автора.
 */
export function TierListTextBreakdown({
  title,
  authorName,
  listData,
  onViewBook,
}: TierListTextBreakdownProps) {
  const groups: NonEmptyTierGroup[] = [];
  let totalPlaced = 0;

  for (const tierId of listData.tierOrder) {
    const tier = listData.tiers[tierId];
    if (!tier || tier.bookIds.length === 0) continue;

    const books = tier.bookIds
      .map((bookId) => listData.books[bookId])
      .filter((b): b is Book => Boolean(b));

    if (books.length === 0) continue;
    totalPlaced += books.length;
    groups.push({
      id: tier.id,
      title: tier.title,
      color: tier.color,
      books,
    });
  }

  if (totalPlaced === 0) return null;

  const safeAuthor = sanitizePublicAuthorName(authorName);
  const summary = buildSummarySentence(title, safeAuthor, totalPlaced, groups);

  return (
    <section
      className="mt-10 relative z-10 max-w-450 w-full mx-auto rounded border border-(--theme-border) bg-(--theme-bg) p-4 sm:p-5"
      aria-labelledby="tier-list-breakdown-heading"
    >
      <h2
        id="tier-list-breakdown-heading"
        className="text-base sm:text-lg font-bold text-(--theme-text)"
      >
        Состав рейтинга
      </h2>
      <p className="mt-2 text-sm text-(--theme-text-muted) leading-relaxed">
        {summary}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded border border-(--theme-border)/70 p-3.5"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block size-3 shrink-0 rounded-xs"
                  style={{ backgroundColor: group.color }}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-bold text-(--theme-text) truncate">
                  {group.title}
                </h3>
              </div>
              <span className="shrink-0 text-xs text-(--theme-text-muted)">
                {group.books.length}{" "}
                {pluralize(group.books.length, "книга", "книги", "книг")}
              </span>
            </div>

            <ul className="space-y-2">
              {group.books.map((book) => {
                const isCatalogBook = Boolean(
                  book.slug && book.status === "published",
                );
                const hasAuthor = Boolean(
                  book.author && book.author !== "Неизвестен",
                );

                return (
                  <li key={book.id} className="text-sm leading-snug">
                    <div className="text-(--theme-text)">
                      {isCatalogBook ? (
                        <Link
                          to={`/books/${book.slug}`}
                          className="font-medium text-(--theme-accent-primary) hover:underline"
                        >
                          {book.title}
                        </Link>
                      ) : onViewBook ? (
                        <button
                          type="button"
                          onClick={() => onViewBook(book)}
                          className="font-medium text-left text-(--theme-text) hover:text-(--theme-accent-primary) hover:underline cursor-pointer"
                        >
                          {book.title}
                        </button>
                      ) : (
                        <span className="font-medium">{book.title}</span>
                      )}
                      {hasAuthor && (
                        <span className="text-(--theme-text-muted)">
                          {" "}
                          — {book.author}
                        </span>
                      )}
                    </div>

                    {book.thoughts && (
                      <blockquote className="mt-1 border-l-2 border-(--theme-accent-primary) pl-2.5 text-xs text-(--theme-text-muted) leading-relaxed whitespace-pre-line">
                        {book.thoughts}
                      </blockquote>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
