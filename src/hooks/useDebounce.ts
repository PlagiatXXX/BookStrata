import { useState, useEffect } from 'react';

/**
 * Хук для дебаунса (задержки) обновления значения.
 * Используется для оптимизации поиска, чтобы не делать запросы на каждый символ.
 *
 * @param value Значение, которое нужно дебаунсить
 * @param delay Задержка в мс (по умолчанию 400мс)
 * @returns Дебаунснутое значение
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
