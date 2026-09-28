// backend/src/modules/books/genreConfidenceExtract.ts
// Парс ответа ИИ для batch-backfill genreConfidence.
export function extractGenreConfidence(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  // 1. Чистое число
  const bare = Number(text);
  if (Number.isFinite(bare) && /^-?\d+(\.\d+)?$/.test(text)) {
    return bare >= 0 && bare <= 1 ? bare : null;
  }

  // 2. JSON с полем (число ловим целиком, диапазон проверяем после Number)
  const match = text.match(/"genreConfidence"\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (match) {
    const v = Number(match[1]);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : null;
  }

  return null;
}
