// src/pages/AdminBooksPage/components/ReadingGuidePrompt.tsx
// Шпаргалка-промпт для генерации AI-паспорта «Гид по чтению» (readingGuide).
// Разворачивается/сворачивается, копируется одним нажатием.
// Симметрична ReadingProfilePrompt (для Reading DNA).

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface ReadingGuidePromptProps {
  bookTitle: string;
  bookAuthor: string | null;
  genre: string | null;
  tags: string[];
  description: string | null;
}

function buildPrompt(book: {
  title: string;
  author: string | null;
  genre: string | null;
  tags: string[];
  description: string | null;
}): string {
  return `Ты — книжный редактор и аналитик каталога BookStrata.
Твоя задача — сформировать структурированный паспорт книги («Гид по чтению» / readingGuide) для вставки в каталог.

Книга: «${book.title}»${book.author ? ` — ${book.author}` : ""}
Жанр: ${book.genre ?? "не указан"}
Теги: ${book.tags.length > 0 ? book.tags.join(", ") : "нет"}
Описание: ${book.description?.slice(0, 500) ?? "нет"}

---

ПРАВИЛА И ОГРАНИЧЕНИЯ:
1. Опирайся строго на предоставленный контекст книги (название, автор, описание, теги).
2. Запрещено галлюцинировать: не придумывай персонажей, вымышленные повороты сюжета и ложные факты. Если книга малоизвестна или вводных мало, опирайся только на общую проблематику жанра.
3. Ответ — на русском, ВСЕГДА строго валидный JSON-объект без вводных фраз, пояснений и вежливости. Не оборачивай ответ в markdown-обёртку (\`\`\`).
4. Значения enum строго фиксированы:
   - reading_pace: "Динамичный" | "Размеренный" | "Медитативный"
   - difficulty: "Легкое чтение" | "Средняя сложность" | "Высокий порог входа"
5. short_hook: ровно 1 хлесткое предложение до 150 символов, передающее смысловое ядро книги.
6. target_audience и not_recommended_for: по 1–2 предложения (каждое до 300 символов).
7. vibe: 2–4 слова через запятую, передающие настроение и атмосферу книги.
8. key_takeaways: строго массив из 2–3 кратких ёмких тезисов, каждый — одно предложение до 100 символов.

---

ФОРМАТ ВЫХОДНЫХ ДАННЫХ (заполни значения, структуру не меняй):
{
  "short_hook": "<одно предложение>",
  "target_audience": "<кому зайдёт>",
  "not_recommended_for": "<кому не зайдёт>",
  "reading_pace": <"Динамичный" ИЛИ "Размеренный" ИЛИ "Медитативный">,
  "difficulty": <"Легкое чтение" ИЛИ "Средняя сложность" ИЛИ "Высокий порог входа">,
  "vibe": "<слова через запятую>",
  "key_takeaways": [
    "<тезис 1>",
    "<тезис 2>"
  ]
}`;
}

export function ReadingGuidePrompt({
  bookTitle,
  bookAuthor,
  genre,
  tags,
  description,
}: ReadingGuidePromptProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = buildPrompt({
    title: bookTitle,
    author: bookAuthor,
    genre,
    tags,
    description,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 rounded-lg border border-(--ink-3) bg-(--bg-0)">
      {/* Header — кликабельный */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-(--ink-0) hover:bg-(--ink-3)/30 transition-colors"
      >
        <BookOpen className="h-4 w-4 text-amber-400" />
        <span>AI-промпт для «Гида по чтению»</span>
        <span className="ml-auto text-(--ink-2)">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-(--ink-3) px-3 py-3 space-y-3">
          {/* Кнопка копирования + текст промпта */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-(--ink-0)">
                Готовый промпт (скопировать → вставить в ChatGPT/Claude)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-(--accent-main) hover:bg-(--accent-main)/10 transition-colors"
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
            <pre className="max-h-60 overflow-auto rounded-md border border-(--ink-3) bg-black/30 p-3 text-[11px] leading-relaxed text-(--ink-1) font-mono whitespace-pre-wrap">
              {prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
