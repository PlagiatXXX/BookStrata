// src/pages/AdminBooksPage/components/CharacterCard.tsx
// Карточка редактирования одного персонажа книги: автокомплит существующих
// канонических персонажей, роль, алиасы/черты (CsvInput), описание и связи.

import { useEffect, useId, useRef, useState } from "react";
import { Trash2, X, Link2 } from "lucide-react";
import {
  searchAdminCharacters,
  type AdminCharacterSearchItem,
  type BookCharacterInput,
} from "@/lib/adminBooksApi";
import type { CharacterRole } from "@/lib/bookApi";
import { ROLE_OPTIONS } from "./charactersEditorUtils";

interface CsvInputProps {
  value: string[];
  maxItems: number;
  ariaLabel: string;
  placeholder: string;
  onChange: (next: string[]) => void;
}

function parseCsvList(raw: string, maxItems: number): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function CsvInput({
  value,
  maxItems,
  ariaLabel,
  placeholder,
  onChange,
}: CsvInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft !== null ? draft : value.join(", ");

  return (
    <input
      aria-label={ariaLabel}
      value={displayValue}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        onChange(parseCsvList(raw, maxItems));
      }}
      onBlur={() => {
        if (draft !== null) {
          onChange(parseCsvList(draft, maxItems));
        }
        setDraft(null);
      }}
      className="w-full rounded-lg border border-(--ink-3) bg-(--bg-1) px-2.5 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
    />
  );
}

export interface CharacterCardProps {
  character: BookCharacterInput;
  index: number;
  total: number;
  otherNames: string[];
  onUpdate: (patch: Partial<BookCharacterInput>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

export function CharacterCard({
  character,
  index,
  total,
  otherNames,
  onUpdate,
  onMove,
  onRemove,
}: CharacterCardProps) {
  const [suggestions, setSuggestions] = useState<AdminCharacterSearchItem[]>(
    [],
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [relTarget, setRelTarget] = useState("");
  const [relLabel, setRelLabel] = useState("");

  const listboxId = useId();
  const comboContainerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      searchSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        comboContainerRef.current &&
        !comboContainerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [dropdownOpen]);

  const handleNameChange = (nextName: string) => {
    onUpdate({ name: nextName });

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchSeqRef.current += 1;
    const seq = searchSeqRef.current;

    const q = nextName.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchAdminCharacters(q);
        if (searchSeqRef.current !== seq) return;
        setSuggestions(res.items);
        setDropdownOpen(res.items.length > 0);
      } catch {
        if (searchSeqRef.current === seq) {
          setSuggestions([]);
          setDropdownOpen(false);
        }
      }
    }, 300);
  };

  const handlePickSuggestion = (item: AdminCharacterSearchItem) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchSeqRef.current += 1;
    setSuggestions([]);
    setDropdownOpen(false);

    const mergedAliases = Array.from(
      new Set(
        [...character.aliases, ...item.aliases]
          .map((a) => a.trim())
          .filter(Boolean),
      ),
    ).slice(0, 8);

    const nextTraits =
      character.traits.length === 0
        ? item.traits.slice(0, 5)
        : character.traits;

    onUpdate({
      characterId: item.id,
      name: item.name,
      universeSlug: item.universeSlug ?? character.universeSlug ?? null,
      aliases: mergedAliases,
      traits: nextTraits,
    });
  };

  const handleAddRelation = () => {
    const targetName = relTarget.trim();
    const label = relLabel.trim();
    if (!targetName || !label) return;
    onUpdate({
      relations: [...character.relations, { targetName, label }],
    });
    setRelTarget("");
    setRelLabel("");
  };

  const summaryLen = character.summary.trim().length;
  const summaryCountClass =
    summaryLen > 500
      ? "text-red-400"
      : summaryLen < 10 || summaryLen > 280
        ? "text-amber-400"
        : "text-(--ink-2)";

  return (
    <div className="rounded-xl border border-(--ink-3) bg-(--bg-0) p-3.5 space-y-3">
      {/* Верхняя строка: Имя + автокомплит + ID-бейдж + порядок/удаление */}
      <div className="flex flex-wrap items-start gap-2">
        <div ref={comboContainerRef} className="relative min-w-48 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs text-(--ink-1)">Имя *</span>
            {character.characterId != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                ID #{character.characterId}
                <button
                  type="button"
                  onClick={() => onUpdate({ characterId: undefined })}
                  aria-label="Отвязать персонажа"
                  title="Отвязать от существующего персонажа"
                  className="rounded-full p-0.5 hover:bg-emerald-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
          <input
            aria-label="Имя персонажа"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={dropdownOpen}
            aria-controls={dropdownOpen ? listboxId : undefined}
            value={character.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && dropdownOpen) {
                e.stopPropagation();
                setDropdownOpen(false);
              }
            }}
            onBlur={() => setDropdownOpen(false)}
            placeholder="Например, Пол Атрейдес"
            className="w-full rounded-lg border border-(--ink-3) bg-(--bg-1) px-2.5 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
          />
          {dropdownOpen && suggestions.length > 0 && (
            <div
              id={listboxId}
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-(--ink-3) bg-(--bg-1) shadow-xl"
            >
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePickSuggestion(item)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-(--ink-0) hover:bg-(--ink-3)/40 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    {item.aliases.length > 0 && (
                      <div className="text-[11px] text-(--ink-2) truncate">
                        {item.aliases.join(", ")}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-(--ink-2)">
                    #{item.id}
                    {item.universeSlug ? ` · ${item.universeSlug}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="w-40">
          <span className="mb-1 block text-xs text-(--ink-1)">Роль</span>
          <select
            aria-label="Роль персонажа"
            value={character.role}
            onChange={(e) =>
              onUpdate({ role: e.target.value as CharacterRole })
            }
            className="w-full rounded-lg border border-(--ink-3) bg-(--bg-1) px-2.5 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1 pt-5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Переместить вверх"
            className="whitespace-nowrap rounded-lg border border-(--ink-3) px-2 py-1 text-xs text-(--ink-1) hover:bg-(--ink-3) hover:text-white disabled:opacity-30 cursor-pointer"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Переместить вниз"
            className="whitespace-nowrap rounded-lg border border-(--ink-3) px-2 py-1 text-xs text-(--ink-1) hover:bg-(--ink-3) hover:text-white disabled:opacity-30 cursor-pointer"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Удалить героя"
            className="whitespace-nowrap rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            Удалить
          </button>
        </div>
      </div>

      {/* Алиасы, черты, вселенная */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <div>
          <span className="mb-1 block text-xs text-(--ink-1)">
            Алиасы / переводы (через запятую)
          </span>
          <CsvInput
            ariaLabel="Алиасы / переводы"
            value={character.aliases}
            maxItems={8}
            placeholder="Муад'Диб, Усул"
            onChange={(aliases) => onUpdate({ aliases })}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs text-(--ink-1)">
            Черты характера (через запятую, до 5)
          </span>
          <CsvInput
            ariaLabel="Черты характера"
            value={character.traits}
            maxItems={5}
            placeholder="стойкий, проницательный"
            onChange={(traits) => onUpdate({ traits })}
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-(--ink-1)">
            Вселенная (slug, опционально)
          </span>
          <input
            aria-label="Вселенная (slug)"
            value={character.universeSlug ?? ""}
            onChange={(e) =>
              onUpdate({ universeSlug: e.target.value || null })
            }
            placeholder="witcher"
            className="w-full rounded-lg border border-(--ink-3) bg-(--bg-1) px-2.5 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
          />
        </label>
      </div>

      {/* Описание (без спойлеров) */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-(--ink-1)">
            Описание (без спойлеров, 10–500 симв.) *
          </span>
          <span className={`text-[11px] font-mono ${summaryCountClass}`}>
            {summaryLen} / 500
          </span>
        </div>
        <textarea
          aria-label="Описание персонажа"
          rows={2}
          value={character.summary}
          onChange={(e) => onUpdate({ summary: e.target.value })}
          placeholder="Стартовая роль и характер героя без спойлеров финала…"
          className="w-full resize-y rounded-lg border border-(--ink-3) bg-(--bg-1) px-2.5 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
        />
      </div>

      {/* Связи в книге */}
      <div className="rounded-lg border border-(--ink-3)/60 bg-(--bg-1)/60 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-(--ink-1)">
          <Link2 size={13} />
          <span>Связи в книге</span>
        </div>

        {character.relations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {character.relations.map((rel, relIdx) => (
              <span
                key={`${rel.targetName}-${rel.label}-${relIdx}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-(--ink-3) bg-(--bg-0) px-2.5 py-0.5 text-xs text-(--ink-0)"
              >
                <span>
                  {rel.label}: {rel.targetName}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      relations: character.relations.filter(
                        (_, idx) => idx !== relIdx,
                      ),
                    })
                  }
                  aria-label={`Удалить связь с ${rel.targetName}`}
                  className="rounded-full p-0.5 text-(--ink-2) hover:text-red-400 cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Связанный персонаж"
            value={relTarget}
            onChange={(e) => setRelTarget(e.target.value)}
            className="min-w-36 flex-1 rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1 text-xs text-(--ink-0) outline-none focus:border-(--accent-main)"
          >
            <option value="">Выберите героя…</option>
            {otherNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            aria-label="Тип связи"
            value={relLabel}
            onChange={(e) => setRelLabel(e.target.value)}
            placeholder="Кем приходится герою (Жена, Ученик…)"
            className="min-w-36 flex-1 rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1 text-xs text-(--ink-0) outline-none focus:border-(--accent-main)"
          />
          <button
            type="button"
            onClick={handleAddRelation}
            disabled={!relTarget.trim() || !relLabel.trim()}
            className="whitespace-nowrap rounded-lg border border-(--ink-3) px-2.5 py-1 text-xs text-(--ink-0) hover:bg-(--ink-3) disabled:opacity-40 cursor-pointer"
          >
            Добавить связь
          </button>
        </div>
        {relTarget && (
          <p className="text-[11px] text-(--ink-2)">
            Превью на карточке: <span className="text-(--ink-0)">{relLabel.trim() || "кем приходится"}: {relTarget}</span>
          </p>
        )}
      </div>
    </div>
  );
}
