import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuthContext";
import { createLogger } from "@/lib/logger";
import {
  fetchShelf,
  apiSetShelfStatus,
  apiRemoveShelfStatus,
  apiRemoveShelfBooks,
  apiImportShelf,
  type ShelfStatus,
  type ShelfState,
  type SlugShelfState,
  type ShelfBookData,
} from "@/lib/shelfApi";
import { BookshelfContext, type BookshelfContextType } from "./bookshelf.context";

export { BookshelfContext, type BookshelfContextType };

const shelfLogger = createLogger("Shelf", { color: "cyan" });

const STORAGE_KEY = "bs-shelf";
const SHELF_META_KEY = "bs-shelf-meta";
const LEGACY_STATUS_PREFIX = "read-status-";

/** Ключ TanStack Query для серверной полки */
const shelfQueryKey = ["shelf"] as const;

/** Данные книг гостевой полки (для find-or-create при импорте после входа) */
type ShelfMeta = Record<string, ShelfBookData>;

function loadLocalShelfMeta(): ShelfMeta {
  try {
    const stored = localStorage.getItem(SHELF_META_KEY);
    const parsed = stored ? (JSON.parse(stored) as ShelfMeta) : {};
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveLocalShelfMeta(meta: ShelfMeta) {
  try {
    localStorage.setItem(SHELF_META_KEY, JSON.stringify(meta));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/** Нормализовать данные книги для meta/импорта (без пустых полей) */
function toShelfBookData(
  bookData?: Partial<ShelfBookData>,
): ShelfBookData | undefined {
  if (!bookData?.title) return undefined;
  const data: ShelfBookData = { title: bookData.title };
  if (bookData.author) data.author = bookData.author;
  if (bookData.coverImageUrl) data.coverImageUrl = bookData.coverImageUrl;
  if (bookData.genre) data.genre = bookData.genre;
  if (bookData.description) data.description = bookData.description;
  if (bookData.slug) data.slug = bookData.slug;
  return data;
}

function loadLocalShelf(): ShelfState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as ShelfState) : {};
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Storage недоступен или битые данные — начинаем с пустой полки
  }

  // Миграция старых per-collection отметок «Прочитал» (read-status-{slug})
  // в глобальную полку: все старые книги становятся статусом "read".
  try {
    const migrated: ShelfState = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_STATUS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const legacy = JSON.parse(raw) as Record<string, unknown>;
          for (const bookId of Object.keys(legacy)) {
            if (!migrated[bookId]) migrated[bookId] = "read" as const;
          }
        }
      }
    }
    if (Object.keys(migrated).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      shelfLogger.info("Перенесены старые отметки прочитанного в полку", {
        count: Object.keys(migrated).length,
      });
      return migrated;
    }
  } catch {
    // Сбой миграции не критичен
  }

  return {};
}

function saveLocalShelf(shelf: ShelfState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shelf));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

export function BookshelfProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [localShelf, setLocalShelf] = useState<ShelfState>(() => {
    if (typeof window === "undefined") return {};
    return loadLocalShelf();
  });

  const [localShelfMeta, setLocalShelfMeta] = useState<ShelfMeta>(() => {
    if (typeof window === "undefined") return {};
    return loadLocalShelfMeta();
  });

  // Персист гостевой полки в localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      saveLocalShelf(localShelf);
      saveLocalShelfMeta(localShelfMeta);
    }
  }, [localShelf, localShelfMeta, isAuthenticated]);

  // Серверная полка — только для авторизованных
  const {
    data: serverShelfData,
    isLoading: isServerLoading,
  } = useQuery({
    queryKey: shelfQueryKey,
    queryFn: fetchShelf,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const serverShelf = useMemo(() => serverShelfData?.[0] ?? {}, [serverShelfData]);
  const serverSlugShelf = useMemo(() => serverShelfData?.[1] ?? {}, [serverShelfData]);

  // Merge гостевой полки после входа: гость дополняет аккаунт один раз
  const mergedRef = useRef(false);
  const importMutation = useMutation({
    mutationFn: (state: ShelfState) => {
      const meta = loadLocalShelfMeta();
      return apiImportShelf(state, meta);
    },
    onSuccess: () => {
      shelfLogger.info("Гостевая полка импортирована в аккаунт");
      setLocalShelf({});
      setLocalShelfMeta({});
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SHELF_META_KEY);
      } catch {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: shelfQueryKey });
    },
    onError: (err) => {
      shelfLogger.warn("Не удалось импортировать гостевую полку", {
        error: err instanceof Error ? err.message : String(err),
      });
    },
  });

  // При входе (гость → авторизован) и наличии гостевой полки — импортируем
  useEffect(() => {
    if (isAuthenticated && !mergedRef.current) {
      mergedRef.current = true;
      const guestShelf = loadLocalShelf();
      if (Object.keys(guestShelf).length > 0) {
        importMutation.mutate(guestShelf);
      }
    }
    if (!isAuthenticated) {
      mergedRef.current = false;
    }
  }, [isAuthenticated, importMutation]);

  // Актуальная полка: авторизованный → серверная, гость → локальная
  const shelf: ShelfState = useMemo(() => {
    if (isAuthenticated) return serverShelf ?? {};
    return localShelf;
  }, [isAuthenticated, serverShelf, localShelf]);

  // Полка по slug: авторизованный → серверная, гость → из meta
  const slugShelf: SlugShelfState = useMemo(() => {
    if (isAuthenticated) return serverSlugShelf ?? {};
    // Гость: строим slug → status из guestBookMeta (slug хранится в meta)
    const result: SlugShelfState = {};
    for (const [key, status] of Object.entries(localShelf)) {
      const meta = localShelfMeta[key];
      if (meta?.slug) {
        result[meta.slug] = status;
      }
    }
    return result;
  }, [isAuthenticated, serverSlugShelf, localShelf, localShelfMeta]);

  // Мутации для авторизованного пользователя (optimistic update)
  const setStatusMutation = useMutation({
    mutationFn: ({
      bookKey,
      status,
      bookData,
    }: {
      bookKey: string;
      status: ShelfStatus;
      bookData?: Partial<ShelfBookData>;
    }) => apiSetShelfStatus(bookKey, status, bookData),
    onMutate: ({ bookKey, status, bookData }) => {
      const prev = queryClient.getQueryData<[ShelfState, SlugShelfState]>(shelfQueryKey) ?? [{}, {}];
      const next: [ShelfState, SlugShelfState] = [
        { ...prev[0], [bookKey]: status },
        { ...prev[1] },
      ];
      // Обновить slug-кэш если есть slug
      if (bookData?.slug) {
        next[1][bookData.slug] = status;
      }
      queryClient.setQueryData(shelfQueryKey, next);
      return { prev };
    },
    // Строковый ключ (книга коллекции) → числовой id, созданный на сервере.
    // Переписываем ключ в кэше, чтобы последующие toggle/remove ходили по числу.
    onSuccess: (entry, { bookKey }) => {
      const serverKey = String(entry.bookId);
      if (serverKey === bookKey) return;
      const current = queryClient.getQueryData<[ShelfState, SlugShelfState]>(shelfQueryKey) ?? [{}, {}];
      const status = current[0][bookKey];
      if (status === undefined) return;
      const next: [ShelfState, SlugShelfState] = [
        { ...current[0] },
        { ...current[1] },
      ];
      delete next[0][bookKey];
      next[0][serverKey] = status;
      // Обновить slug если сервер вернул slug
      if (entry.slug) {
        next[1][entry.slug] = status;
      }
      queryClient.setQueryData(shelfQueryKey, next);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(shelfQueryKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shelfQueryKey });
    },
  });

  const removeStatusMutation = useMutation({
    mutationFn: ({ bookKey }: { bookKey: string }) => apiRemoveShelfStatus(bookKey),
    onMutate: ({ bookKey }) => {
      const prev = queryClient.getQueryData<[ShelfState, SlugShelfState]>(shelfQueryKey) ?? [{}, {}];
      const next: [ShelfState, SlugShelfState] = [
        { ...prev[0] },
        { ...prev[1] },
      ];
      delete next[0][bookKey];
      // Удалить slug-запись: найти slug по значению статуса (приближённо)
      const removedStatus = prev[0][bookKey];
      if (removedStatus) {
        for (const [slug, status] of Object.entries(next[1])) {
          if (status === removedStatus) {
            delete next[1][slug];
            break; // удаляем первое совпадение
          }
        }
      }
      queryClient.setQueryData(shelfQueryKey, next);
      return { prev };
    },
    onError: (_err, _bookId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(shelfQueryKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shelfQueryKey });
    },
  });

  // Bulk-удаление набора книг одним запросом (секция полки / вся полка)
  const removeBooksMutation = useMutation({
    mutationFn: (bookIds: string[]) => apiRemoveShelfBooks(bookIds),
    onMutate: (bookIds) => {
      const prev = queryClient.getQueryData<[ShelfState, SlugShelfState]>(shelfQueryKey) ?? [{}, {}];
      const idSet = new Set(bookIds);
      // Собрать статусы удаляемых книг для очистки slugShelf
      const removedStatuses = new Set<ShelfStatus>();
      for (const bookId of bookIds) {
        const s = prev[0][bookId];
        if (s) removedStatuses.add(s);
      }
      const next: [ShelfState, SlugShelfState] = [
        {},
        {},
      ];
      for (const [bookId, status] of Object.entries(prev[0])) {
        if (!idSet.has(bookId)) next[0][bookId] = status;
      }
      // Сохранить slug-записи только для оставшихся книг (у которых bookId ещё в next[0])
      for (const [slug, status] of Object.entries(prev[1])) {
        if (!removedStatuses.has(status)) {
          next[1][slug] = status;
        }
      }
      queryClient.setQueryData(shelfQueryKey, next);
      return { prev };
    },
    onError: (_err, _bookIds, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(shelfQueryKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shelfQueryKey });
    },
  });

  const toggleStatus = useCallback(
    (
      bookKey: string,
      status: ShelfStatus,
      bookData?: Partial<ShelfBookData>,
    ) => {
      if (isAuthenticated) {
        const current = serverShelf?.[bookKey];
        if (current === status) {
          removeStatusMutation.mutate({ bookKey });
        } else {
          setStatusMutation.mutate({ bookKey, status, bookData });
        }
        return;
      }

      // Гость — в localStorage
      setLocalShelf((prev) => {
        const current = prev[bookKey];
        if (current === status) {
          const next = { ...prev };
          delete next[bookKey];
          return next;
        }
        return { ...prev, [bookKey]: status };
      });
      // Данные книги для будущего импорта (строка → Book в БД)
      setLocalShelfMeta((prev) => {
        const book = toShelfBookData(bookData);
        if (!book) return prev;
        return { ...prev, [bookKey]: book };
      });
    },
    [isAuthenticated, serverShelf, setStatusMutation, removeStatusMutation],
  );

  const setStatus = useCallback(
    (
      bookKey: string,
      status: ShelfStatus,
      bookData?: Partial<ShelfBookData>,
    ) => {
      if (isAuthenticated) {
        setStatusMutation.mutate({ bookKey, status, bookData });
      } else {
        setLocalShelf((prev) => ({ ...prev, [bookKey]: status }));
        const book = toShelfBookData(bookData);
        if (book) {
          setLocalShelfMeta((prev) => ({ ...prev, [bookKey]: book }));
        }
      }
    },
    [isAuthenticated, setStatusMutation],
  );

  const removeStatus = useCallback(
    (bookKey: string) => {
      if (isAuthenticated) {
        removeStatusMutation.mutate({ bookKey });
      } else {
        setLocalShelf((prev) => {
          if (!prev[bookKey]) return prev;
          const next = { ...prev };
          delete next[bookKey];
          return next;
        });
        setLocalShelfMeta((prev) => {
          if (!prev[bookKey]) return prev;
          const next = { ...prev };
          delete next[bookKey];
          return next;
        });
      }
    },
    [isAuthenticated, removeStatusMutation],
  );

  const removeBooks = useCallback(
    (bookKeys: string[]) => {
      if (bookKeys.length === 0) return;
      if (isAuthenticated) {
        removeBooksMutation.mutate(bookKeys);
      } else {
        const keySet = new Set(bookKeys);
        setLocalShelf((prev) => {
          const next: ShelfState = {};
          for (const [bookKey, status] of Object.entries(prev)) {
            if (!keySet.has(bookKey)) next[bookKey] = status;
          }
          return next;
        });
        setLocalShelfMeta((prev) => {
          const next: ShelfMeta = {};
          for (const [bookKey, data] of Object.entries(prev)) {
            if (!keySet.has(bookKey)) next[bookKey] = data;
          }
          return next;
        });
      }
    },
    [isAuthenticated, removeBooksMutation],
  );

  const clearShelf = useCallback(() => {
    if (isAuthenticated) {
      const current = serverShelf ?? {};
      const bookKeys = Object.keys(current);
      if (bookKeys.length > 0) {
        removeBooksMutation.mutate(bookKeys);
      } else {
        queryClient.setQueryData<[ShelfState, SlugShelfState]>(shelfQueryKey, [{}, {}]);
      }
    } else {
      setLocalShelf({});
      setLocalShelfMeta({});
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SHELF_META_KEY);
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, serverShelf, queryClient, removeBooksMutation]);

  const importLocalShelf = useCallback(async () => {
    const guestShelf = loadLocalShelf();
    if (Object.keys(guestShelf).length === 0) return;
    const meta = loadLocalShelfMeta();
    try {
      await apiImportShelf(guestShelf, meta);
      setLocalShelf({});
      setLocalShelfMeta({});
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SHELF_META_KEY);
      } catch {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: shelfQueryKey });
    } catch (err) {
      shelfLogger.warn("Ручной импорт полки не удался", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [queryClient]);

  const counts = useMemo(() => {
    let readCount = 0;
    let wantToReadCount = 0;
    for (const status of Object.values(shelf)) {
      if (status === "read") readCount += 1;
      else wantToReadCount += 1;
    }
    return { readCount, wantToReadCount, totalCount: readCount + wantToReadCount };
  }, [shelf]);

  const value: BookshelfContextType = {
    shelf,
    slugShelf,
    guestBookMeta: localShelfMeta,
    isLoading: isAuthenticated ? isServerLoading : false,
    totalCount: counts.totalCount,
    readCount: counts.readCount,
    wantToReadCount: counts.wantToReadCount,
    toggleStatus,
    setStatus,
    removeStatus,
    removeBooks,
    clearShelf,
    importLocalShelf,
  };

  return (
    <BookshelfContext.Provider value={value}>{children}</BookshelfContext.Provider>
  );
}