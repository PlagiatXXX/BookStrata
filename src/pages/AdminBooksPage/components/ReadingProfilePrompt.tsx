// src/pages/AdminBooksPage/components/ReadingProfilePrompt.tsx
// Шпаргалка-промпт для генерации Reading DNA через AI.
// Разворачивается/сворачивается по клику, текст копируется одним нажатием.

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface ReadingProfilePromptProps {
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
  return `Ты — литературный аналитик. Оцени книгу по 4 осям Reading DNA.

Книга: «${book.title}»${book.author ? ` — ${book.author}` : ""}
Жанр: ${book.genre ?? "не указан"}
Теги: ${book.tags.length > 0 ? book.tags.join(", ") : "нет"}
Описание: ${book.description?.slice(0, 500) ?? "нет"}

---

ОЦЕНИ ПО ЧЕТЫРЁМ ОСЯМ (0–100):

01. storyFocus (Сюжет ↔ Рефлексия)
  0–20 — чистый экшн. Погони, интриги, twist за twist.
  20–40 — сюжет ведёт, но есть место для дыхания.
  40–60 — баланс. События и внутренний мир чередуются.
  60–80 — рефлексия主导. События — повод для размышлений.
  80–100 — чистая интроспекция. Поток сознания, эссеистика.

02. emotionalWeight (Легко ↔ Тяжело)
  0–20 — воздушное чтиво. Комедия, уют, лёгкость.
  20–40 — мягкое. Есть грусть, но без надавливания.
  40–60 — средний вес. Бывают и радость, и боль.
  60–80 — тяжело. Боль, потеря, экзистенциальный кризис.
  80–100 — надрыв. Катарсис через страдание.

03. pace (Быстро ↔ Погружение)
  0–20 — стрелочная скорость. Главы по 5 страниц.
  20–40 — быстрое чтение. Динамичное, но не истеричное.
  40–60 — размеренное. Средний темп.
  60–80 — неторопливое. Длинные описания, паузы.
  80–100 — медитативное. Каждое предложение — мир.

04. darkness (Светло ↔ Мрачно)
  0–20 — максимально светлое. Надежда, добро, порядок.
  20–40 — преимущественно тёплое. Есть тревога, но свет побеждает.
  40–60 — нейтрально-серое. Жизнь как она есть.
  60–80 — преимущественно тёмное. Атмосфера тревоги, одиночества.
  80–100 — максимально тёмное. Безысходность, абсурд, нигилизм.

Для каждой оси оцени confidence (0–1):
  0.9–1.0 — уверенно, достаточно данных
  0.7–0.8 — вероятно, но есть неопределённость
  0.5–0.6 — приблизительно, мало данных
  < 0.5 — сложно определить

---

ВЕРНИ ТОЛЬКО JSON (без markdown-обёртки):
{
  "storyFocus": <число 0–100>,
  "emotionalWeight": <число 0–100>,
  "pace": <число 0–100>,
  "darkness": <число 0–100>,
  "confidence": {
    "storyFocus": <0–1>,
    "emotionalWeight": <0–1>,
    "pace": <0–1>,
    "darkness": <0–1>
  },
  "source": "ai"
}`;
}

const AXIS_RUBRICS = [
  {
    name: "storyFocus",
    label: "Сюжет ↔ Рефлексия",
    rows: [
      { range: "0–20", desc: "Чистый экшн. Погони, интриги, twist за twist." },
      { range: "20–40", desc: "Сюжет ведёт, но есть место для дыхания." },
      { range: "40–60", desc: "Баланс. События и внутренний мир чередуются." },
      { range: "60–80", desc: "Рефлексия主导. События — повод для размышлений." },
      { range: "80–100", desc: "Чистая интроспекция. Поток сознания, эссеистика." },
    ],
  },
  {
    name: "emotionalWeight",
    label: "Легко ↔ Тяжело",
    rows: [
      { range: "0–20", desc: "Воздушное чтиво. Комедия, уют, лёгкость." },
      { range: "20–40", desc: "Мягкое. Есть грусть, но без надавливания." },
      { range: "40–60", desc: "Средний вес. Бывают и радость, и боль." },
      { range: "60–80", desc: "Тяжело. Боль, потеря, экзистенциальный кризис." },
      { range: "80–100", desc: "Надрыв. Катарсис через страдание." },
    ],
  },
  {
    name: "pace",
    label: "Быстро ↔ Погружение",
    rows: [
      { range: "0–20", desc: "Стелочная скорость. Главы по 5 страниц." },
      { range: "20–40", desc: "Быстрое чтение. Динамичное, но не истеричное." },
      { range: "40–60", desc: "Размеренное. Средний темп." },
      { range: "60–80", desc: "Неторопливое. Длинные описания, паузы." },
      { range: "80–100", desc: "Медитативное. Каждое предложение — мир." },
    ],
  },
  {
    name: "darkness",
    label: "Светло ↔ Мрачно",
    rows: [
      { range: "0–20", desc: "Максимально светлое. Надежда, добро, порядок." },
      { range: "20–40", desc: "Преимущественно тёплое. Есть тревога, но свет побеждает." },
      { range: "40–60", desc: "Нейтрально-серое. Жизнь как она есть." },
      { range: "60–80", desc: "Преимущественно тёмное. Атмосфера тревоги, одиночества." },
      { range: "80–100", desc: "Максимально тёмное. Безысходность, абсурд, нигилизм." },
    ],
  },
];

export function ReadingProfilePrompt({
  bookTitle,
  bookAuthor,
  genre,
  tags,
  description,
}: ReadingProfilePromptProps) {
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
        <Sparkles className="h-4 w-4 text-amber-400" />
        <span>AI-промпт для Reading DNA</span>
        <span className="ml-auto text-(--ink-2)">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-(--ink-3) px-3 py-3 space-y-4">
          {/* Рубрики оценки */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AXIS_RUBRICS.map((axis) => (
              <div key={axis.name} className="rounded-md bg-(--ink-3)/20 p-2.5">
                <div className="text-xs font-semibold text-(--ink-0) mb-1.5">
                  {axis.label}
                </div>
                <div className="space-y-0.5">
                  {axis.rows.map((row) => (
                    <div key={row.range} className="flex gap-2 text-[11px] text-(--ink-2)">
                      <span className="shrink-0 w-12 font-mono text-(--ink-1)">{row.range}</span>
                      <span>{row.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Confidence-шкала */}
          <div className="rounded-md bg-(--ink-3)/20 p-2.5">
            <div className="text-xs font-semibold text-(--ink-0) mb-1.5">Confidence</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-(--ink-2)">
              <span><b className="text-(--ink-1)">0.9–1.0</b> — уверенно</span>
              <span><b className="text-(--ink-1)">0.7–0.8</b> — вероятно</span>
              <span><b className="text-(--ink-1)">0.5–0.6</b> — приблизительно</span>
              <span><b className="text-(--ink-1)">&lt; 0.5</b> — сложно определить</span>
            </div>
          </div>

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
