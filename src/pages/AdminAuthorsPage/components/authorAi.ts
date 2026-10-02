// src/pages/AdminAuthorsPage/components/authorAiPrompt.ts
// Генератор промпта для ИИ (заполнение ручных полей автора) и парсер ответа.
// Зеркалит лимиты authorContentInputSchema на бэке (Zod max).

export const AUTHOR_AI_LIMITS = {
  badge: 200,
  motto: 500,
  manifestoQuote: 2000,
  manifestoAuthor: 200,
  manifestoRole: 200,
  aboutText: 20000,
  statValue: 50,
  statLabel: 100,
  stats: 8,
} as const;

/** Что заливается в форму редактора (без полей вне формы). */
export interface AuthorAiFill {
  badge: string;
  motto: string;
  manifestoQuote: string;
  manifestoAuthor: string;
  manifestoRole: string;
  aboutText: string;
  stats: { value: string; label: string }[];
  /** Источники из ответа ИИ — для ручной сверки, в payload не попадают. */
  statSources: string[];
}

export function buildAuthorAiPrompt(authorName: string): string {
  return `Ты — редактор страниц авторов каталога BookStrata. Пиши живым языком, без канцелярита и шаблонов — но строго по проверяемым фактам.

Автор: ${authorName}

---

ПРАВИЛА:
1. Галлюцинации запрещены: не выдумывай премии, фестивали, издательства, цифры и цитаты. Сомневаешься — оставляй поле пустым ("").
2. Ответ — на русском: ВСЕ строковые значения JSON — на русском (включая цитаты, подписи и источники). Строго валидный JSON: без markdown-обёрток (\`\`\`json), без пояснений до/после, без вводных фраз.
3. manifestoQuote / manifestoAuthor — только реальная, где-то опубликованная цитата, и на русском. Цитата существует только на иностранном языке — дай точный русский перевод с оригиналом в скобках: «перевод (ориг.: оригинал)»; достоверного перевода нет — "manifestoQuote" = "". Не смог найти точного автора — "manifestoAuthor" и "manifestoRole" равны "".
4. motto — короткий слоган об авторе (не цитата!), он НЕ должен повторять manifestoQuote.
5. Статистика: только достоверные цифры, и для КАЖДОЙ пары обязательно поле "source" — краткий источник («Википедия», «Британника», «официальный сайт»). Источник неизвестен — не включай эту цифру. Максимум 5 пар. Приоритет: кол-во написанных книг, романов с экранизациями, рекорды («№1 в New York Times»), тиражи, премии.
6. Никаких оценочных суперлативов («величайший», «лучший в мире»).

ПОЛЯ:
- badge: до 40 символов — статус-ярлык над именем («Классик», «Лауреат Нобелевской премии»). Только проверенный статус, иначе "".
- motto: до 70 символов — девиз-слоган в одну строку.
- manifestoQuote: до 400 символов — цитата-манифест на русском, 1–3 предложения (иноязычная — перевод + оригинал в скобках).
- manifestoAuthor / manifestoRole: кто произнёс и его роль, иначе "".
- aboutText: до 1200 символов — 3–5 предложений о траектории автора: жанры, ключевые темы, место в литературе. Без оценок и без повторов манифеста.
- stats: массив 3–5 объектов { "value", "label", "source" }; "value" — короткая цифра/число (до 30 символов), "label" — подпись в нижнем регистре (до 60 символов), "source" — обязательный источник.

---

ФОРМАТ:
{
  "badge": "<до 40 символов или пустая строка>",
  "motto": "<до 70 символов>",
  "manifestoQuote": "<цитата>",
  "manifestoAuthor": "<автор цитаты или пустая строка>",
  "manifestoRole": "<роль автора цитаты или пустая строка>",
  "aboutText": "<3–5 предложений>",
  "stats": [
    { "value": "<цифра>", "label": "<подпись>", "source": "<источник>" }
  ]
}`;
}

/** Срезает markdown-обёртку ```json ... ``` из ответа ИИ */
function stripMarkdownFence(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned.startsWith("```")) return cleaned;
  return cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
}

const clamp = (v: string, max: number) => v.slice(0, max);

/**
 * Парсит ответ ИИ → патч формы редактора.
 * Невалидный JSON / не-объект — исключение с понятным сообщением.
 */
export function parseAuthorAiResponse(raw: string): AuthorAiFill {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFence(raw));
  } catch {
    throw new Error("Ответ ИИ не является валидным JSON — скопируйте ответ целиком");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Ответ ИИ должен быть JSON-объектом вида { \"badge\": …, \"stats\": […] }");
  }

  const obj = parsed as Record<string, unknown>;
  const text = (key: keyof AuthorAiFill, max: number): string =>
    typeof obj[key] === "string" ? clamp(obj[key] as string, max) : "";

  const stats: AuthorAiFill["stats"] = [];
  const statSources: string[] = [];
  if (Array.isArray(obj.stats)) {
    for (const row of obj.stats) {
      if (stats.length >= AUTHOR_AI_LIMITS.stats) break;
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      const value = typeof r.value === "string" ? clamp(r.value, AUTHOR_AI_LIMITS.statValue) : "";
      const label = typeof r.label === "string" ? clamp(r.label, AUTHOR_AI_LIMITS.statLabel) : "";
      if (value.trim() === "" || label.trim() === "") continue;
      stats.push({ value, label });
      statSources.push(typeof r.source === "string" ? r.source : "");
    }
  }

  return {
    badge: text("badge", AUTHOR_AI_LIMITS.badge),
    motto: text("motto", AUTHOR_AI_LIMITS.motto),
    manifestoQuote: text("manifestoQuote", AUTHOR_AI_LIMITS.manifestoQuote),
    manifestoAuthor: text("manifestoAuthor", AUTHOR_AI_LIMITS.manifestoAuthor),
    manifestoRole: text("manifestoRole", AUTHOR_AI_LIMITS.manifestoRole),
    aboutText: text("aboutText", AUTHOR_AI_LIMITS.aboutText),
    stats,
    statSources,
  };
}
