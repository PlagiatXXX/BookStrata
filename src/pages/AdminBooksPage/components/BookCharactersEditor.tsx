// src/pages/AdminBooksPage/components/BookCharactersEditor.tsx
// Редактор персонажей книги для админки: ручное добавление, импорт JSON из ИИ,
// стабильные ключи карточек и каскадное обновление связей при переименовании/удалении.

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { BookCharacterInput } from "@/lib/adminBooksApi";
import { CharactersPrompt } from "./CharactersPrompt";
import { CharacterCard } from "./CharacterCard";
import {
  createEmptyCharacter,
  parseAiCharactersJson,
} from "./charactersEditorUtils";

let nextRowKeySeq = 0;
function createRowKey(): string {
  nextRowKeySeq += 1;
  return `char-row-${nextRowKeySeq}`;
}

export interface BookCharactersEditorProps {
  bookTitle: string;
  bookAuthor: string | null;
  genre: string | null;
  description: string | null;
  value: BookCharacterInput[];
  onChange: (next: BookCharacterInput[]) => void;
}

export function BookCharactersEditor({
  bookTitle,
  bookAuthor,
  genre,
  description,
  value,
  onChange,
}: BookCharactersEditorProps) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    value.map(() => createRowKey()),
  );

  // Синхронизируем длину ключей, если value изменён снаружи
  if (rowKeys.length < value.length) {
    setRowKeys([
      ...rowKeys,
      ...Array.from({ length: value.length - rowKeys.length }, () =>
        createRowKey(),
      ),
    ]);
  } else if (rowKeys.length > value.length) {
    setRowKeys(rowKeys.slice(0, value.length));
  }

  const handleAdd = () => {
    setRowKeys((keys) => [...keys, createRowKey()]);
    onChange([...value, createEmptyCharacter()]);
  };

  const handleUpdate = (index: number, patch: Partial<BookCharacterInput>) => {
    const prevName = value[index]?.name.trim() ?? "";
    const hasNameChange = patch.name !== undefined;
    const nextName = hasNameChange ? patch.name!.trim() : prevName;
    const renamed =
      hasNameChange &&
      prevName !== "" &&
      nextName !== "" &&
      prevName !== nextName;

    onChange(
      value.map((item, idx) => {
        if (idx === index) {
          return { ...item, ...patch };
        }
        if (renamed) {
          return {
            ...item,
            relations: item.relations.map((rel) =>
              rel.targetName.trim() === prevName
                ? { ...rel, targetName: nextName }
                : rel,
            ),
          };
        }
        return item;
      }),
    );
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;

    setRowKeys((keys) => {
      const nextKeys = [...keys];
      [nextKeys[index], nextKeys[target]] = [nextKeys[target], nextKeys[index]];
      return nextKeys;
    });

    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const handleRemove = (index: number) => {
    const removedName = value[index]?.name.trim() ?? "";
    setRowKeys((keys) => keys.filter((_, idx) => idx !== index));
    onChange(
      value
        .filter((_, idx) => idx !== index)
        .map((item) =>
          removedName
            ? {
                ...item,
                relations: item.relations.filter(
                  (rel) => rel.targetName.trim() !== removedName,
                ),
              }
            : item,
        ),
    );
  };

  const handleApplyJson = () => {
    const result = parseAiCharactersJson(jsonInput);
    if (result.error || !result.items) {
      setJsonError(result.error ?? "Не удалось разобрать JSON");
      return;
    }
    setJsonError(null);
    setJsonInput("");
    setJsonOpen(false);
    setRowKeys(result.items.map(() => createRowKey()));
    onChange(result.items);
  };

  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-(--ink-0)">
          Персонажи книги ({value.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setJsonOpen((prev) => !prev);
              setJsonError(null);
            }}
            className="flex whitespace-nowrap items-center gap-1 rounded-lg border border-(--ink-3) px-2.5 py-1.5 text-xs text-(--ink-0) hover:bg-(--ink-3) cursor-pointer"
          >
            <Sparkles size={13} className="text-amber-400" />
            Вставить JSON из ИИ
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex whitespace-nowrap items-center gap-1 rounded-lg bg-(--accent-main) px-2.5 py-1.5 text-xs font-medium text-(--bg-0) hover:opacity-90 cursor-pointer"
          >
            + Добавить героя
          </button>
        </div>
      </div>

      <CharactersPrompt
        bookTitle={bookTitle}
        bookAuthor={bookAuthor}
        genre={genre}
        description={description}
      />

      {jsonOpen && (
        <div className="mt-3 rounded-xl border border-(--ink-3) bg-(--bg-0) p-3 space-y-2">
          <textarea
            aria-label="JSON персонажей из ИИ"
            rows={6}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[{"name": "Пол Атрейдес", "role": "protagonist", ...}]'
            className={`w-full resize-y rounded-lg border bg-(--bg-1) px-3 py-2 font-mono text-xs text-(--ink-0) outline-none ${
              jsonError
                ? "border-red-500 text-red-200"
                : "border-(--ink-3) focus:border-(--accent-main)"
            }`}
          />
          {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyJson}
              className="whitespace-nowrap rounded-lg bg-(--accent-main) px-3 py-1.5 text-xs font-semibold text-(--bg-0) hover:opacity-90 cursor-pointer"
            >
              Применить JSON
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonOpen(false);
                setJsonError(null);
              }}
              className="whitespace-nowrap rounded-lg border border-(--ink-3) px-3 py-1.5 text-xs text-(--ink-1) hover:bg-(--ink-3) cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {value.length === 0 ? (
        <p className="mt-2 text-xs text-(--ink-2)">
          Пока нет персонажей — добавьте вручную или вставьте JSON из ИИ.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {value.map((char, idx) => {
            const otherNames = value
              .filter((_, i) => i !== idx)
              .map((c) => c.name.trim())
              .filter(Boolean);

            return (
              <CharacterCard
                key={rowKeys[idx] ?? `fallback-${idx}`}
                character={char}
                index={idx}
                total={value.length}
                otherNames={otherNames}
                onUpdate={(patch) => handleUpdate(idx, patch)}
                onMove={(dir) => handleMove(idx, dir)}
                onRemove={() => handleRemove(idx)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
