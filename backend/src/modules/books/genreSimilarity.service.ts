// backend/src/modules/books/genreSimilarity.service.ts
// Бэк-порт src/features/book-match/domain/genreSimilarity.ts —
// та же формула, что на фронте (конвенция дублирования домена).
import { parseBookGenre, tagToCategoryId, type CategoryId } from "./genreTaxonomy.js";

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
