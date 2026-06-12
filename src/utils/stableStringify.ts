/**
 * Стабильная сериализация в JSON.
 *
 * В отличие от JSON.stringify, рекурсивно сортирует ключи объектов,
 * чтобы два одинаковых объекта всегда давали одинаковую строку
 * независимо от порядка ключей.
 *
 * Используется для сравнения payload-ов при сохранении тир-листа.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, stableSortReplacer);
}

/**
 * Replacer для JSON.stringify, который сортирует ключи объектов
 * и массивы по предсказуемому порядку.
 */
function stableSortReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Если это массив — рекурсивно обрабатываем каждый элемент
  if (Array.isArray(value)) {
    return value.map((item) => stableStringifyReplacer(item));
  }

  // Если это объект — сортируем ключи
  if (typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = obj[key];
    }
    return result;
  }

  return value;
}

/**
 * Рекурсивно обрабатывает одно значение для стабильной сериализации.
 */
function stableStringifyReplacer(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stableStringifyReplacer(item));
  }

  if (typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = obj[key];
    }
    return result;
  }

  return value;
}
