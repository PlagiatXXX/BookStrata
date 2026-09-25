// 7-я ось Match Score: сходство любимых жанров пользователя и книги.
// Чистая математика (domain layer). Бэк-порт: backend/.../genreSimilarity.service.ts.
//
// Формула (спека §1):
//   base    = |категории жанра книги ∩ выбор пользователя| / |категории книги|
//   bonus   = 0.2 × (доля тегов книги, мапящихся в категории выбора)
//   raw     = min(1, base + bonus)
//   result  = round(raw × (genreConfidence ?? 0.5) × 100)
//   категории пустые или выбор пуст → undefined (ось неактивна, веса нормализуются без неё)

import {
  parseBookGenre,
  tagToCategoryId,
  type CategoryId,
} from "@/data/genre-taxonomy";

export function genreSimilarity(
  userGenres: CategoryId[],
  book: { genre: string | null; tags: string[]; genreConfidence?: number },
): number | undefined {
  if (userGenres.length === 0) return undefined;

  const bookCats = parseBookGenre(book.genre);
  if (bookCats.length === 0) return undefined;

  const userSet = new Set(userGenres);
  const base = bookCats.filter((c) => userSet.has(c)).length / bookCats.length;

  const tagRatio =
    book.tags.length > 0
      ? book.tags.filter((t) => {
          const id = tagToCategoryId(t);
          return id !== null && userSet.has(id);
        }).length / book.tags.length
      : 0;

  const raw = Math.min(1, base + 0.2 * tagRatio);
  const confidence = book.genreConfidence ?? 0.5;
  return Math.round(raw * confidence * 100);
}
