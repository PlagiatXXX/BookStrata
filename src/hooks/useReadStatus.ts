import { useState, useEffect, useCallback, useMemo } from "react";

export type ReadStatus = "read" | "reading" | "want";

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

  // Циклическое переключение: null → read → reading → want → null
  const toggleStatus = useCallback((bookId: string) => {
    setStatuses((prev) => {
      const current = prev[bookId];
      if (!current) return { ...prev, [bookId]: "read" as const };
      if (current === "read") return { ...prev, [bookId]: "reading" as const };
      if (current === "reading") return { ...prev, [bookId]: "want" as const };
      // want → удаляем (null)
      const next = { ...prev };
      delete next[bookId];
      return next;
    });
  }, []);

  const readCount = useMemo(
    () => Object.values(statuses).filter((s) => s === "read").length,
    [statuses],
  );

  const totalMarked = useMemo(
    () => Object.keys(statuses).length,
    [statuses],
  );

  return { statuses, toggleStatus, readCount, totalMarked };
}
