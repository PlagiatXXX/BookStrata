// backend/src/lib/validators.ts
// Хелперы для валидации данных на бэкенде

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Проверяет, что base64 data URL изображения не превышает лимит по размеру.
 * Возвращает null, если размер в норме, или строку с ошибкой.
 *
 * @param dataUrl - data URL вида "data:image/png;base64,..."
 * @param maxSize - максимальный размер в байтах (по умолчанию 5MB)
 */
export function validateImageSize(
  dataUrl: string,
  maxSize = MAX_IMAGE_SIZE,
): string | null {
  if (!dataUrl.startsWith("data:")) return null; // не base64 — пропускаем

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return "Некорректный data URL";

  const base64Data = dataUrl.slice(commaIndex + 1);
  if (!base64Data) return "Некорректный data URL";

  // Декодированный размер ≈ (длина base64) * 3/4, минус padding
  const padding = base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0;
  const decodedSize = Math.ceil((base64Data.length * 3) / 4 - padding);

  if (decodedSize > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0);
    return `Размер изображения превышает лимит ${mb}MB`;
  }

  return null;
}
