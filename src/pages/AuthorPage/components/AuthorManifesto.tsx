// src/pages/AuthorPage/components/AuthorManifesto.tsx
// Секция «Манифест письма» (спека §2): 12-колоночный грид — слева цитата
// с атрибуцией, справа карточка «О траектории автора» с aboutText.
// Секция рендерится при заполненном manifestoQuote ИЛИ aboutText;
// без цитаты — только карточка, отцентрованная в гриде.
import { Feather } from "lucide-react";
import type { AuthorPageData } from "@/lib/authorsApi";

type AuthorManifestoProps = {
  author: AuthorPageData["author"];
};

export function AuthorManifesto({ author }: AuthorManifestoProps) {
  const hasQuote = Boolean(author.manifestoQuote);
  if (!hasQuote && !author.aboutText) return null;

  return (
    <section className="ap-section">
      <div className="ap-manifesto grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {hasQuote && (
          <div className="flex flex-col gap-6 border-y border-[var(--ap-gold)]/40 py-10 lg:col-span-6">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[var(--ap-gold)]" />
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
                Манифест письма
              </span>
            </div>

            <blockquote className="ap-manifesto-quote font-[family-name:var(--ap-display)] text-xl font-light italic leading-relaxed text-[var(--ap-ink)] md:text-2xl">
              {author.manifestoQuote}
            </blockquote>

            {(author.manifestoAuthor || author.manifestoRole) && (
              <footer className="flex items-center gap-3">
                <Feather
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[var(--ap-gold)]"
                />
                <div className="flex flex-col gap-0.5">
                  {author.manifestoAuthor && (
                    <span className="text-xs font-semibold text-[var(--ap-ink)]">
                      {author.manifestoAuthor}
                    </span>
                  )}
                  {author.manifestoRole && (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--ap-ink-muted)]">
                      {author.manifestoRole}
                    </span>
                  )}
                </div>
              </footer>
            )}
          </div>
        )}

        {author.aboutText && (
          <div
            className={`flex flex-col gap-4 rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] p-6 ${
              hasQuote ? "lg:col-span-6" : "lg:col-span-6 lg:col-start-4"
            }`}
          >
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
              О траектории автора
            </span>
            <p className="whitespace-pre-line text-sm font-light leading-relaxed text-[var(--ap-ink)]">
              {author.aboutText}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
