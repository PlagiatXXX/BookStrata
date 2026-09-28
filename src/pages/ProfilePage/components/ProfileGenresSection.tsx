// src/pages/ProfilePage/components/ProfileGenresSection.tsx
// Секция «Любимые жанры» — 7-я ось Book Match.
// Мультивыбор до MAX_GENRE_PREFERENCES, автосейв по клику (optimistic через хук).
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
      className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Любимые жанры
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Влияют на рекомендации Book Match
          </p>
        </div>
        <span
          data-testid="genres-counter"
          className="shrink-0 text-xs tabular-nums text-white/50"
        >
          {selected.length}/{MAX_GENRE_PREFERENCES}
        </span>
      </div>

      <div className="space-y-4">
        {GENRE_GROUPS.map((group) => (
          <div key={group.id}>
            <p
              data-testid={`genre-group-${group.id}`}
              className="mb-2 text-xs uppercase tracking-wider text-white/35"
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
                          ? "rounded-full border border-(--bp-primary)/60 bg-(--bp-primary)/20 px-3 py-1 text-xs font-medium text-white"
                          : "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      }
                    >
                      {category.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>

      {atLimit && (
        <p className="mt-4 text-xs text-white/35">
          Достигнут лимит — снимите один жанр, чтобы выбрать другой
        </p>
      )}
    </section>
  );
}
