// src/pages/ProfilePage/components/ProfileGenresSection.tsx
// Секция «Любимые жанры» — 7-я ось Book Match.
// Мультивыбор до MAX_GENRE_PREFERENCES, автосейв по клику (optimistic через хук).
import { Check } from "lucide-react";
import {
  useGenrePreferences,
  useSetGenrePreferences,
  MAX_GENRE_PREFERENCES,
} from "@/hooks/useGenrePreferences";
import {
  GENRE_GROUPS,
  GENRE_CATEGORIES,
  type CategoryId,
} from "@/data/genre-taxonomy";

export function ProfileGenresSection() {
  const { data: selected = [] } = useGenrePreferences();
  const setPreferences = useSetGenrePreferences();

  const toggle = (id: CategoryId) => {
    const isSelected = selected.includes(id);
    if (!isSelected && selected.length >= MAX_GENRE_PREFERENCES) return;
    const next = isSelected ? selected.filter((g) => g !== id) : [...selected, id];
    setPreferences.mutate(next);
  };

  const atLimit = selected.length >= MAX_GENRE_PREFERENCES;

  return (
    <section
      aria-label="Любимые жанры"
      className="mt-6 rounded-2xl border border-white/10 bg-[#16172b]/80 p-5 backdrop-blur-sm sm:p-6 shadow-lg shadow-black/20"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">
            Любимые жанры
          </h2>
          <p className="mt-1 text-xs text-[#a8aac0]">
            Влияют на рекомендации Book Match
          </p>
        </div>
        <span
          data-testid="genres-counter"
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums border transition-colors ${
            atLimit
              ? "border-amber-400/50 bg-amber-400/20 text-amber-300"
              : selected.length > 0
                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                : "border-white/15 bg-white/5 text-white/60"
          }`}
        >
          {selected.length}/{MAX_GENRE_PREFERENCES}
        </span>
      </div>

      <div className="space-y-5">
        {GENRE_GROUPS.map((group) => (
          <div key={group.id}>
            <p
              data-testid={`genre-group-${group.id}`}
              className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400/80"
            >
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRE_CATEGORIES.filter((c) => c.group === group.id).map(
                (category) => {
                  const isSelected = selected.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={!isSelected && atLimit}
                      onClick={() => toggle(category.id)}
                      className={
                        isSelected
                          ? "inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-amber-300 bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-[#0f1020] shadow-[0_0_12px_rgba(251,191,36,0.45)] transition-all hover:bg-amber-300 hover:shadow-[0_0_16px_rgba(251,191,36,0.65)] hover:-translate-y-0.5 active:translate-y-0"
                          : "inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/85 transition-all hover:border-amber-400/60 hover:bg-white/[0.12] hover:text-white hover:shadow-[0_0_10px_rgba(251,191,36,0.15)] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:bg-white/[0.06] disabled:hover:text-white/85 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      }
                    >
                      {isSelected && (
                        <Check size={12} className="stroke-[2.5]" aria-hidden="true" />
                      )}
                      <span>{category.label}</span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>

      {atLimit && (
        <p className="mt-4 text-xs font-medium text-amber-300/85">
          Достигнут лимит — снимите один жанр, чтобы выбрать другой
        </p>
      )}
    </section>
  );
}
