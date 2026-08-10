import { apiClient } from "./api-client";

/** Статус книги в «Моей полке» */
export type ShelfStatus = "read" | "want_to_read";

/** Полка как state: ключ книги (string — как во фронтовых Book.id) → статус */
export type ShelfState = Record<string, ShelfStatus>;

/** Данные книги для find-or-create на сервере (для книг коллекций) */
export interface ShelfBookData {
  title: string;
  author?: string;
  coverImageUrl?: string;
  genre?: string;
  description?: string;
}

interface ApiShelfEntry {
  bookId: number;
  status: ShelfStatus;
}

interface ApiImportResponse {
  imported: number;
}

interface ApiRemoveResponse {
  removed: number;
}

/** Убрать данные, которые нельзя слать на сервер (NaN/пустые) */
function toApiBookData(book: Partial<ShelfBookData>): ShelfBookData | undefined {
  if (!book?.title) return undefined;
  const data: ShelfBookData = { title: book.title };
  if (book.author) data.author = book.author;
  if (book.coverImageUrl) data.coverImageUrl = book.coverImageUrl;
  if (book.genre) data.genre = book.genre;
  if (book.description) data.description = book.description;
  return data;
}

/** Получить полку авторизованного пользователя */
export async function fetchShelf(): Promise<ShelfState> {
  const entries = await apiClient.get<ApiShelfEntry[]>("/shelf");
  const state: ShelfState = {};
  for (const entry of entries) {
    state[String(entry.bookId)] = entry.status;
  }
  return state;
}

/** Книга полки (снимок из таблицы Book) */
export interface ShelfBook {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
  genre: string | null;
  description: string | null;
}

export interface ShelfBookEntry {
  bookId: number;
  status: ShelfStatus;
  book: ShelfBook;
}

/**
 * Полка с данными книг — для страницы «Полка».
 * Только для авторизованного пользователя.
 */
export async function fetchShelfBooks(): Promise<ShelfBookEntry[]> {
  return apiClient.get<ShelfBookEntry[]>("/shelf/books");
}

/**
 * Установить статус книги (upsert).
 * bookKey — число (id таблицы Book) или строковый ключ книги коллекции
 * ("curated_..."); для строкового ключа bookData нужна для find-or-create.
 * Возвращает числовой id книги — фронт подменяет им строковый ключ.
 */
export async function apiSetShelfStatus(
  bookKey: string,
  status: ShelfStatus,
  bookData?: Partial<ShelfBookData>,
): Promise<{ bookId: number }> {
  const body: Record<string, unknown> = { status };
  const book = toApiBookData(bookData ?? {});
  if (book) body.book = book;
  const entry = await apiClient.put<ApiShelfEntry>(
    `/shelf/books/${encodeURIComponent(bookKey)}`,
    body,
  );
  return { bookId: entry.bookId };
}

/** Снять отметку с книги (по ключу; числовые ключи удаляют, остальные — no-op) */
export async function apiRemoveShelfStatus(bookKey: string): Promise<void> {
  await apiClient.delete(`/shelf/books/${encodeURIComponent(bookKey)}`);
}

/** Снять отметки с набора книг одним запросом (секция/вся полка) */
export async function apiRemoveShelfBooks(bookKeys: string[]): Promise<number> {
  const result = await apiClient.post<ApiRemoveResponse>("/shelf/remove", {
    bookKeys,
  });
  return result.removed;
}

/**
 * Импортировать гостевую полку в аккаунт после входа.
 * Для строковых ключей нужны данные книги — берутся из гостевого meta.
 */
export async function apiImportShelf(
  state: ShelfState,
  meta: Record<string, ShelfBookData>,
): Promise<number> {
  const items = Object.entries(state).map(([bookKey, status]) => {
    const book = toApiBookData(meta[bookKey] ?? {});
    return book ? { bookKey, status, book } : { bookKey, status };
  });
  const result = await apiClient.post<ApiImportResponse>("/shelf/import", {
    items,
  });
  return result.imported;
}