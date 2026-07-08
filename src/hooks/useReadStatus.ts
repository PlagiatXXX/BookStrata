import { useState, useEffect, useCallback, useMemo } from "react";

export type ReadStatus = "read";

const STORAGE_PREFIX = "read-status-";

function loadStatuses(slug: string): Record<string, ReadStatus> {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatuses(slug: string, statuses: Record<string, ReadStatus>) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(statuses));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

export function useReadStatus(collectionSlug: string | undefined) {
  const slug = collectionSlug ?? "default";

  const [statuses, setStatuses] = useState<Record<string, ReadStatus>>(() =>
    loadStatuses(slug),
  );

  // Синхронизация с localStorage при каждом изменении
  useEffect(() => {
    saveStatuses(slug, statuses);
  }, [statuses, slug]);

  // Бинарное переключение: null → "read" → null
  const toggleStatus = useCallback((bookId: string) => {
    setStatuses((prev) => {
      if (prev[bookId]) {
        // Было "read" → снимаем
        const next = { ...prev };
        delete next[bookId];
        return next;
      }
      // Не было → ставим "read"
      return { ...prev, [bookId]: "read" as const };
    });
  }, []);

  const markedCount = useMemo(
    () => Object.keys(statuses).length,
    [statuses],
  );

  return { statuses, toggleStatus, markedCount };
}
