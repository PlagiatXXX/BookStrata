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
  return `Ты — книжный редактор каталога BookStrata. Пиши живым языком, без канцелярита и шаблонов — но строго по фактам книги.

Книга: «${book.title}»${book.author ? ` — ${book.author}` : ""}
Жанр: ${book.genre ?? "не указан"}
Теги: ${book.tags.length > 0 ? book.tags.join(", ") : "нет"}
Описание: ${book.description?.slice(0, 500) ?? "нет"}

---

ПРАВИЛА:
1. Опирайся строго на контекст книги. Галлюцинировать запрещено: никаких выдуманных персонажей, поворотов сюжета и фактов. Если данных мало — опирайся на жанровую проблематику.
2. Ответ — на русском, строго валидный JSON без markdown-обёрток, вводных фраз и «здравствуйте».
3. Enum-значения фиксированы:
   - reading_pace: "Динамичный" | "Размеренный" | "Медитативный"
   - difficulty: "Легкое чтение" | "Средняя сложность" | "Высокий порог входа"

ПОЛЯ ПАСПОРТА:
5. short_hook: одно точное предложение (до 150 символов), за которое зацепится читатель. Не «книга о…», а именно хук.
6. target_audience: 1–2 предложения о тех, кого книга зацепит. Конкретно: не «широкой аудитории», а «тем, кто любит X и ценит Y».
7. friction_points: прямо ответь на вопрос «Кому пропустить эту книгу?». 1–2 предложения — назови аудиторию, которой НЕ зайдёт, и почему. Не описывай элементы стиля абстрактно — говори с точки зрения читателя:
   ✓ «Тем, кто ждёт быстрого сюжета — темп здесь неторопливый, акцент на переживаниях, а не на событиях»
   ✓ «Любителям романтики — романтической линии здесь нет, несмотря на тег»
   ✗ «Размеренный темп может показаться слишком спокойным» — так не надо, это описание, а не ответ.
8. vibe: 2–4 слова через запятую — настроение и атмосфера. Без «в целом» и «в основном».
9. key_takeaways: 2–3 тезиса (массив строк), каждый — одно ёмкое предложение до 100 символов. О чём эта книга на самом деле.

---

ФОРМАТ:
{
  "short_hook": "<хук>",
  "target_audience": "<кому зайдёт, конкретно>",
  "friction_points": "<кому пропустить, прямо и с причиной>",
  "reading_pace": <"Динамичный" | "Размеренный" | "Медитативный">,
  "difficulty": <"Легкое чтение" | "Средняя сложность" | "Высокий порог входа">,
  "vibe": "<слова через запятую>",
  "key_takeaways": ["<тезис 1>", "<тезис 2>"]
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
