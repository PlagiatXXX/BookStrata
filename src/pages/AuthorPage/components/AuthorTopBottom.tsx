// src/pages/AuthorPage/components/AuthorTopBottom.tsx
// «Лучшие книги» / «Слабые книги»: две независимые колонки компактных карточек.
// Оба массива пусты — секция скрыта; пуста одна — рендерится только вторая.
import { Link } from "react-router-dom";
import type { AuthorBookCard } from "@/lib/authorsApi";

type AuthorTopBottomProps = {
  top: AuthorBookCard[];
  bottom: AuthorBookCard[];
};

type Rank = "gold" | "rose";

const RANK_STYLE: Record<Rank, { label: string; accent: string }> = {
  gold: { label: "Лучшие книги", accent: "text-[var(--ap-gold)]" },
  rose: { label: "Слабые книги", accent: "text-[var(--ap-rose)]" },
};

function RankCard({ book, rank }: { book: AuthorBookCard; rank: Rank }) {
  const { accent } = RANK_STYLE[rank];
  const inner = (
    <>
      <div className="overflow-hidden rounded-[var(--ap-radius)] border border-[var(--ap-border)] bg-[var(--ap-surface)]">
        <img
          src={book.coverImageUrl}
          alt={`Обложка книги «${book.title}»`}
          loading="lazy"
          className="aspect-[2/3] w-full object-cover"
        />
      </div>
      <h3 className="mt-3 font-[family-name:var(--ap-display)] text-sm font-medium text-[var(--ap-ink)]">
        {book.title}
      </h3>
      <div className="mt-1 text-xs uppercase tracking-[0.15em] text-[var(--ap-ink-muted)]">
        {[book.genre, book.publishedYear].filter(Boolean).join(" · ") || "—"}
      </div>
      {book.rating !== null && (
        <div className={`mt-1 text-sm font-semibold ${accent}`}>
          {book.rating.toFixed(1)} / 10
        </div>
      )}
    </>
  );

  const className = "ap-rank-card group block";

  return book.slug ? (
    <Link to={`/books/${book.slug}`} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function RankColumn({ books, rank }: { books: AuthorBookCard[]; rank: Rank }) {
  const { label, accent } = RANK_STYLE[rank];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={`h-px w-8 ${rank === "gold" ? "bg-[var(--ap-gold)]" : "bg-[var(--ap-rose)]"}`} />
        <h2
          className={`font-[family-name:var(--ap-display)] text-xl font-light ${accent} md:text-2xl`}
        >
          {label}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <RankCard key={book.id} book={book} rank={rank} />
        ))}
      </div>
    </div>
  );
}

export function AuthorTopBottom({ top, bottom }: AuthorTopBottomProps) {
  if (top.length === 0 && bottom.length === 0) return null;

  return (
    <section className="ap-section">
      <div className="grid gap-10 md:grid-cols-2">
        {top.length > 0 && <RankColumn books={top} rank="gold" />}
        {bottom.length > 0 && <RankColumn books={bottom} rank="rose" />}
      </div>
    </section>
  );
}
