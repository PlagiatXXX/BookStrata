// src/pages/TierListEditorPage/bookClick.ts
// Единый каталог (19.08): поведение клика по книге зависит от режима.
// В режиме просмотра (чужой/публичный тир-лист) клик на каталоговую
// (published) книгу с slug ведёт на страницу книги /books/{slug}?from={tierListId};
// в режиме редактирования (владелец) клик всегда открывает модалку просмотра —
// в ней видны персональные данные (мысли, личная обложка), которых нет
// на публичной странице книги.
import type { Book } from "@/types";

export type BookClickTarget =
  | { type: "navigate"; path: string }
  | { type: "modal" };

/** Цель клика по книге в режиме просмотра (read-only). */
export const getBookClickTarget = (
  book: Book,
  tierListId: string,
): BookClickTarget => {
  if (book.status === "published" && book.slug) {
    return { type: "navigate", path: `/books/${book.slug}?from=${tierListId}` };
  }
  return { type: "modal" };
};

/** Цель клика по книге в редакторе: владелец всегда видит модалку
 *  (в ней доступны мысли и личная обложка), навигация — только для
 *  зрителей (isReadOnly). */
export const getBookViewAction = (
  book: Book,
  tierListId: string,
  isReadOnly: boolean,
): BookClickTarget => {
  if (isReadOnly) return getBookClickTarget(book, tierListId);
  return { type: "modal" };
};