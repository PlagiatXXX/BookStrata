// src/pages/AuthorPage/components/AuthorOtherAuthors.tsx
// Перелинковка: популярные авторы каталога (без текущего) — внутренние линки
// внизу SEO-страницы автора. Пустой список → секция не рендерится.
import { Link } from "react-router-dom";
import type { AuthorResult } from "@/lib/authorsApi";

interface AuthorOtherAuthorsProps {
  authors: AuthorResult[];
}

/** Русские склонения: 1 книга, 2 книги, 5 книг. */
function booksLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} книга`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} книги`;
  return `${n} книг`;
}

export function AuthorOtherAuthors({ authors }: AuthorOtherAuthorsProps) {
  if (!authors.length) return null;

  return (
    <section className="ap-section" aria-labelledby="ap-other-authors">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-[var(--ap-gold)]" />
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
            Каталог
          </span>
        </div>
        <h2
          id="ap-other-authors"
          className="font-[family-name:var(--ap-display)] text-xl font-light text-[var(--ap-ink)] md:text-2xl"
        >
          Другие авторы
        </h2>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((a) => (
          <li key={a.id}>
            <Link to={`/authors/${a.slug}`} className="ap-cta-tile group block p-5">
              <span className="block font-[family-name:var(--ap-display)] text-base text-[var(--ap-ink)]">
                {a.name}
              </span>
              <span className="mt-1 flex items-center gap-2 text-xs text-[var(--ap-ink-muted)]">
                {booksLabel(a.bookCount)}
                <span
                  aria-hidden="true"
                  className="text-[var(--ap-gold)] transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
