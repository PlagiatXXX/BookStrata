// src/pages/AdminBooksPage/components/CharactersPrompt.tsx
// Шпаргалка-промпт для AI-генерации списка персонажей книги без спойлеров.
// Разворачивается/сворачивается, копируется одним нажатием (по образцу ReadingGuidePrompt).

import { useEffect, useRef, useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Users } from "lucide-react";

interface CharactersPromptProps {
  bookTitle: string;
  bookAuthor: string | null;
  genre: string | null;
  description: string | null;
}

function buildCharactersPrompt(book: {
  title: string;
  author: string | null;
  genre: string | null;
  description: string | null;
}): string {
  return `Ты — книжный редактор каталога BookStrata. Составь список ключевых персонажей книги для карточки читателя.

Книга: «${book.title}»${book.author ? ` — ${book.author}` : ""}
Жанр: ${book.genre ?? "не указан"}
Описание: ${book.description?.slice(0, 500) ?? "нет"}

---

ПРАВИЛА:
1. СТРОГО БЕЗ СПОЙЛЕРОВ: запрещено раскрывать финалы, смерти персонажей, скрытых предателей, неожиданные родственные связи и развязки. Описывай только завязку истории, стартовую роль героя и исходные отношения.
2. Выдели 3–8 ключевых героев книги (от главного к второстепенным).
3. Ответ — на русском языке, строго валидный JSON-массив без markdown-обёрток, комментариев и вводных фраз.
4. Поля каждого объекта:
   - "name": каноническое имя персонажа на русском (строка, 1–120 символов).
   - "aliases": массив альтернативных имён, прозвищ или вариантов перевода (до 8 строк; если нет — []).
   - "universeSlug": латинский slug общей книжной вселенной в kebab-case, если книга входит в известный цикл (например "witcher", "dune", "cosmere"), иначе null.
   - "role": строго одно из значений: "protagonist" | "antagonist" | "supporting" | "minor".
   - "traits": 2–5 коротких черт характера или амплуа (массив строк до 40 символов).
   - "summary": краткое описание героя без спойлеров (10–500 символов, оптимально 100–250 символов).
   - "relations": массив исходных связей с другими героями из этого же списка [{ "targetName": "<точное name другого героя>", "label": "<кем targetName приходится ЭТОМУ герою>" }].
     ВАЖНО про направление "label": на карточке связь выводится как "<label>: <targetName>", поэтому "label" ВСЕГДА отвечает на вопрос «Кем targetName приходится ЭТОМУ герою?»:
     ✓ В карточке «Чэнь»: { "targetName": "Чжан Бинь", "label": "Научный наставник" } (Чжан Бинь — наставник Чэня)
     ✓ В карточке «Чжан Бинь»: { "targetName": "Чэнь", "label": "Ученик" }, { "targetName": "Чжэн Мин", "label": "Жена" }
     ✓ В карточке «Чжэн Мин»: { "targetName": "Чжан Бинь", "label": "Муж" }
     ✗ В карточке «Чжан Бинь» НЕ пиши "Муж" для Чжэн Мин или "Научный наставник" для Чэня (это роли самого Чжан Биня, а не targetName!).

---

ФОРМАТ:
[
  {
    "name": "<Имя героя>",
    "aliases": ["<Прозвище или вариант перевода>"],
    "universeSlug": null,
    "role": "protagonist",
    "traits": ["<черта 1>", "<черта 2>"],
    "summary": "<Описание завязки и роли героя без спойлеров>",
    "relations": [
      { "targetName": "<Имя другого героя>", "label": "<тип связи>" }
    ]
  }
]`;
}

export function CharactersPrompt({
  bookTitle,
  bookAuthor,
  genre,
  description,
}: CharactersPromptProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const prompt = buildCharactersPrompt({
    title: bookTitle,
    author: bookAuthor,
    genre,
    description,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Игнорируем ошибку доступа к буферу обмена в ограниченном окружении
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-(--ink-3) bg-(--bg-0)">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-(--ink-0) hover:bg-(--ink-3)/30 transition-colors rounded px-1 py-0.5 -ml-1 cursor-pointer"
        >
          <Users className="h-4 w-4 text-amber-400" />
          <span>AI-промпт для списка персонажей (без спойлеров)</span>
          <span className="ml-auto text-(--ink-2)">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 whitespace-nowrap items-center gap-1 rounded px-2 py-1 text-xs text-(--accent-main) hover:bg-(--accent-main)/10 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Скопировано
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Копировать
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-(--ink-3) px-3 py-3 space-y-2">
          <span className="block text-xs font-semibold text-(--ink-0)">
            Готовый промпт (скопировать → вставить в ChatGPT/Claude)
          </span>
          <pre className="max-h-60 overflow-auto rounded-md border border-(--ink-3) bg-black/30 p-3 text-[11px] leading-relaxed text-(--ink-1) font-mono whitespace-pre-wrap">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
