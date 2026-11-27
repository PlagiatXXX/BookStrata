// backend/src/utils/aiJson.ts
// Очистка JSON из ответов ИИ: снятие Markdown-обёрток ```json ... ```,
// артефактов копипаста (Markdown hard line break, HTML-сущности пробелов,
// экранирование структурных символов) и вводного/завершающего текста.
// Зеркалит src/utils/aiJson.ts на фронтенде.

/** Снимает ```json ... ``` обёртку, даже если перед ней есть вводный текст. */
export function stripMarkdownJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match?.[1] !== undefined) {
    return match[1].trim();
  }
  return trimmed;
}

/** Очищает артефакты Markdown/HTML копипаста из веб-интерфейсов ИИ. */
export function cleanAiCopyArtifacts(text: string): string {
  let cleaned = text
    // HTML-сущности пробелов/табов/переносов из редакторов и чатов ИИ
    .replace(/&#x0*20;|&#32;|&nbsp;|\u00a0/gi, " ")
    .replace(/&#x0*09;|&#9;/gi, "\t")
    .replace(/&#x0*0a;|&#10;/gi, "\n")
    // Markdown hard line break: обратный слэш перед концом строки
    .replace(/\\(?=[ \t]*\r?\n)/g, "")
    // Markdown-экранирование структурных символов (не трогаем двойной \\ и \")
    .replace(/(?<!\\)\\([[\]{}_*])/g, "$1")
    .trim();

  // Если вокруг JSON осталась вводная/финальная фраза без ``` — вырезаем до внешних скобок
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  const startCandidates = [firstObj, firstArr].filter((i) => i !== -1);
  if (startCandidates.length > 0) {
    const start = Math.min(...startCandidates);
    const openChar = cleaned[start];
    const closeChar = openChar === "[" ? "]" : "}";
    const end = cleaned.lastIndexOf(closeChar);
    if (end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }

  return cleaned;
}

/** Парсит JSON из ответа ИИ: сначала чистый JSON, при ошибке — очистка артефактов. */
export function parseAiJson(raw: string): unknown {
  const unfenced = stripMarkdownJsonFence(raw);
  try {
    return JSON.parse(unfenced);
  } catch {
    return JSON.parse(cleanAiCopyArtifacts(unfenced));
  }
}