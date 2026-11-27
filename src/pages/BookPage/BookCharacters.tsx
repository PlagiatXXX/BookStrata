// src/pages/BookPage/BookCharacters.tsx
// Секция «Ключевые герои» на странице книги (Nocturne Editorial).
// Все карточки остаются в DOM (скрываются через hidden) для корректного SEO-пререндера.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { BookCharacterView, CharacterRole } from "@/lib/bookApi";
import { rememberBookReturnScroll } from "@/utils/bookNavigation";

export interface BookCharactersProps {
  characters: BookCharacterView[];
}

const INITIAL_VISIBLE_COUNT = 6;

const ROLE_META: Record<
  CharacterRole,
  { label: string; badgeClass: string; avatarClass: string }
> = {
  protagonist: {
    label: "Главный герой",
    badgeClass:
      "border-(--bp-primary)/40 bg-(--bp-primary)/12 text-(--bp-primary)",
    avatarClass:
      "border-(--bp-primary)/50 bg-(--bp-primary)/15 text-(--bp-primary)",
  },
  antagonist: {
    label: "Антагонист",
    badgeClass: "border-rose-400/35 bg-rose-500/12 text-rose-300",
    avatarClass: "border-rose-400/45 bg-rose-500/15 text-rose-300",
  },
  supporting: {
    label: "Ключевой",
    badgeClass:
      "border-(--bp-tertiary)/35 bg-(--bp-tertiary)/12 text-(--bp-tertiary)",
    avatarClass:
      "border-(--bp-tertiary)/45 bg-(--bp-tertiary)/15 text-(--bp-tertiary)",
  },
  minor: {
    label: "Второстепенный",
    badgeClass: "border-white/15 bg-white/5 text-white/70",
    avatarClass: "border-white/20 bg-white/8 text-white/80",
  },
};

const ROLE_ORDER: CharacterRole[] = [
  "protagonist",
  "antagonist",
  "supporting",
  "minor",
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function BookCharacters({ characters }: BookCharactersProps) {
  const [roleFilter, setRoleFilter] = useState<CharacterRole | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState<{
    id: number;
    seq: number;
  } | null>(null);

  useEffect(() => {
    if (!highlightTarget) return;
    const el = document.getElementById(`character-${highlightTarget.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const timer = window.setTimeout(() => {
      setHighlightTarget((prev) =>
        prev?.seq === highlightTarget.seq ? null : prev,
      );
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [highlightTarget]);

  if (characters.length === 0) {
    return null;
  }

  const showFilters = characters.length >= INITIAL_VISIBLE_COUNT;
  const hasCollapsedExtra =
    characters.length > INITIAL_VISIBLE_COUNT &&
    !expanded &&
    roleFilter === "all";

  const roleCounts = ROLE_ORDER.reduce<Partial<Record<CharacterRole, number>>>(
    (acc, role) => {
      const count = characters.filter((c) => c.role === role).length;
      if (count > 0) acc[role] = count;
      return acc;
    },
    {},
  );

  const jumpToCharacter = (targetCharacterId: number) => {
    setRoleFilter("all");
    setExpanded(true);
    setHighlightTarget((prev) => ({
      id: targetCharacterId,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  return (
    <section
      id="characters"
      aria-label="Ключевые герои"
      className="relative py-12 border-t border-primary/20 bg-(--bp-surface-container-lowest)"
    >
      <div className="max-w-275 mx-auto px-4 md:px-5">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="bp-display text-white text-xl md:text-2xl not-italic">
              Ключевые герои
            </h2>
            <p className="mt-1 text-xs text-white/60">
              Персонажи, их роли и связи в сюжете
            </p>
          </div>

          {showFilters && (
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Фильтр по ролям персонажей"
            >
              <button
                type="button"
                aria-pressed={roleFilter === "all"}
                onClick={() => setRoleFilter("all")}
                className={`whitespace-nowrap bp-label-caps bp-tag-caps px-3 py-1.5 rounded-full border transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--bp-primary) ${
                  roleFilter === "all"
                    ? "border-(--bp-primary) bg-(--bp-primary)/15 text-(--bp-primary)"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                Все ({characters.length})
              </button>

              {ROLE_ORDER.map((role) => {
                const count = roleCounts[role];
                if (!count) return null;
                const active = roleFilter === role;
                return (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRoleFilter(role)}
                    className={`whitespace-nowrap bp-label-caps bp-tag-caps px-3 py-1.5 rounded-full border transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--bp-primary) ${
                      active
                        ? "border-(--bp-primary) bg-(--bp-primary)/15 text-(--bp-primary)"
                        : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {ROLE_META[role].label} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char, index) => {
            const roleMeta = ROLE_META[char.role] ?? ROLE_META.minor;
            const matchesRole =
              roleFilter === "all" || char.role === roleFilter;
            const hiddenByCollapse =
              roleFilter === "all" &&
              !expanded &&
              index >= INITIAL_VISIBLE_COUNT;
            const isHidden = !matchesRole || hiddenByCollapse;
            const isHighlighted = highlightTarget?.id === char.characterId;
            const visibleTraits = char.traits.slice(0, 4);

            return (
              <article
                key={char.id}
                id={`character-${char.characterId}`}
                hidden={isHidden}
                data-highlighted={isHighlighted ? "true" : undefined}
                className={
                  isHidden
                    ? "hidden"
                    : `min-w-0 flex flex-col justify-between gap-4 rounded-xl border p-5 bg-(--bp-surface-container-low) transition-all duration-300 ${
                        isHighlighted
                          ? "border-(--bp-primary) ring-2 ring-(--bp-primary)/40 shadow-[0_0_24px_rgba(255,183,135,0.2)]"
                          : "border-white/10 hover:border-(--bp-primary)/35"
                      }`
                }
              >
                <div className="min-w-0 space-y-3">
                  {/* Шапка карточки: аватар-монограмма + имя/алиасы + роль */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      aria-hidden="true"
                      className={`w-11 h-11 rounded-full border shrink-0 flex items-center justify-center font-semibold text-sm tracking-wide ${roleMeta.avatarClass}`}
                    >
                      {getInitials(char.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className="bp-display text-white text-base md:text-lg leading-snug not-italic wrap-break-word min-w-0">
                          {char.name}
                        </h3>
                        <span
                          className={`bp-label-caps bp-tag-caps px-2 py-0.5 rounded-full border shrink-0 ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.label}
                        </span>
                      </div>

                      {char.aliases.length > 0 && (
                        <p className="mt-1 text-xs text-white/55 wrap-break-word">
                          Также: {char.aliases.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Черты характера (до 4 тегов) */}
                  {visibleTraits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {visibleTraits.map((trait, idx) => (
                        <span
                          key={`${trait}-${idx}`}
                          className="bp-label-caps bp-tag-caps px-2 py-1 rounded bg-white/5 border border-white/10 text-white/75 wrap-break-word"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Описание персонажа */}
                  {char.summary && (
                    <p className="text-sm text-white/80 leading-relaxed wrap-break-word">
                      {char.summary}
                    </p>
                  )}
                </div>

                {/* Нижний блок: связи и другие книги */}
                {(char.relations.length > 0 || char.otherBooks.length > 0) && (
                  <div className="min-w-0 pt-3 border-t border-white/10 space-y-2.5">
                    {char.relations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {char.relations.map((rel, relIdx) => (
                          <button
                            key={`${rel.targetCharacterId}-${rel.label}-${relIdx}`}
                            type="button"
                            onClick={() =>
                              jumpToCharacter(rel.targetCharacterId)
                            }
                            className="text-left text-xs px-2.5 py-1 rounded-md border border-(--bp-primary)/25 bg-(--bp-primary)/8 text-(--bp-on-surface-variant) hover:border-(--bp-primary)/60 hover:bg-(--bp-primary)/15 hover:text-white active:scale-[0.98] transition-colors wrap-break-word focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--bp-primary)"
                          >
                            <span className="text-white/60">{rel.label}:</span>{" "}
                            <span className="text-(--bp-primary) font-medium">
                              {rel.targetName}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {char.otherBooks.length > 0 && (
                      <div className="text-xs text-white/60 leading-relaxed wrap-break-word">
                        <span>Также в книгах: </span>
                        {char.otherBooks.map((ob, idx) => (
                          <span key={ob.id}>
                            {idx > 0 && ", "}
                            <Link
                              to={`/books/${ob.slug}`}
                              onClick={rememberBookReturnScroll}
                              className="text-(--bp-tertiary) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--bp-primary) rounded-xs"
                            >
                              {ob.title}
                            </Link>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {hasCollapsedExtra && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="whitespace-nowrap px-5 py-2.5 rounded-lg border border-(--bp-primary)/40 bg-(--bp-primary)/10 text-sm font-medium text-(--bp-primary) hover:bg-(--bp-primary)/20 active:scale-[0.98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--bp-primary)"
            >
              Показать всех героев ({characters.length})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
