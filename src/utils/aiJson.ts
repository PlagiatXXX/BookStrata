// src/utils/aiJson.ts
// Парсинг JSON из ответов ИИ с защитой от Markdown-обёрток, hard-line-break (\ в конце строки),
// HTML-сущностей пробела (&#x20;) и экранированных структурных символов при копировании.

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
function cleanAiCopyArtifacts(text: string): string {
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

/**
 * Парсит JSON из ответа ИИ.
 * Сначала пробует чистый JSON (после снятия ```json), чтобы не задеть валидные
 * экранирования в строках; при ошибке чистит Markdown/HTML-артефакты и пробует снова.
 */
export function parseAiJson(raw: string): unknown {
  const unfenced = stripMarkdownJsonFence(raw);
  try {
    return JSON.parse(unfenced);
  } catch {
    return JSON.parse(cleanAiCopyArtifacts(unfenced));
  }
}
