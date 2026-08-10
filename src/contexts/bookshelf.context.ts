import { createContext } from "react";
import type { ShelfStatus, ShelfState, ShelfBookData } from "@/lib/shelfApi";

/** Статус «Прочитал» — подтип статусов полки (для совместимости со старым кодом) */
export type ReadStatus = Extract<ShelfStatus, "read">;

/** Данные книг гостевой полки (ключ книги → данные для карточки/импорта) */
export type GuestBookMeta = Record<string, ShelfBookData>;

export interface BookshelfContextType {
  /** Вся полка: bookId (string) → статус */
  shelf: ShelfState;
  /** Данные книг гостевой полки (localStorage) — для карточек неавторизованного */
  guestBookMeta: GuestBookMeta;
  isLoading: boolean;
  totalCount: number;
  readCount: number;
  wantToReadCount: number;
  /**
   * Установить статус книги (взаимоисключающие: одна книга = один статус).
   * Повторный клик по активному статусу — снимает отметку.
   * bookData — данные книги для find-or-create (нужны для строковых ключей
   * книг коллекций; для числовых id можно не передавать).
   */
  toggleStatus: (
    bookId: string,
    status: ShelfStatus,
    bookData?: Partial<ShelfBookData>,
  ) => void;
  /** Установить статус без toggle-логики */
  setStatus: (
    bookId: string,
    status: ShelfStatus,
    bookData?: Partial<ShelfBookData>,
  ) => void;
  /** Снять отметку */
  removeStatus: (bookId: string) => void;
  /** Снять отметки с набора книг одним запросом (секция/вся полка) */
  removeBooks: (bookIds: string[]) => void;
  /** Очистить полку целиком (используется при создании тир-листа «из всех») */
  clearShelf: () => void;
  /** Импортировать гостевую полку в аккаунт (вызывается после логина) */
  importLocalShelf: () => Promise<void>;
}

export const BookshelfContext = createContext<BookshelfContextType | undefined>(
  undefined,
);