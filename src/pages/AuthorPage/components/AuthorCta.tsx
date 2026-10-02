// src/pages/AuthorPage/components/AuthorCta.tsx
// Финальная навигационная секция: две плитки-ссылки (паттерн CTA из эталона).
// Показывается всегда — это навигация, а не данные автора.
import { Link } from "react-router-dom";

const TILES = [
  { to: "/authors", label: "Смотреть авторов", hint: "Все авторы каталога" },
  { to: "/rankings", label: "Найти свою книгу", hint: "Поиск по каталогу" },
] as const;

export function AuthorCta() {
  return (
    <section className="ap-section">
      <div className="ap-cta-panel flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--ap-gold)]" />
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
              Продолжить
            </span>
          </div>
          <h2 className="font-[family-name:var(--ap-display)] text-xl font-light text-[var(--ap-ink)] md:text-2xl">
            Куда дальше
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {TILES.map((tile) => (
            <Link key={tile.to} to={tile.to} className="ap-cta-tile group block p-5">
              <span className="block font-[family-name:var(--ap-display)] text-base text-[var(--ap-ink)]">
                {tile.label}
              </span>
              <span className="mt-1 flex items-center gap-2 text-xs text-[var(--ap-ink-muted)]">
                {tile.hint}
                <span
                  aria-hidden="true"
                  className="text-[var(--ap-gold)] transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
