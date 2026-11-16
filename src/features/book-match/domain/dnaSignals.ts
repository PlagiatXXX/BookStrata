// src/features/book-match/domain/dnaSignals.ts
// Доменная детекция контекстных связей книги с персональным ДНК читателя.

import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

export interface BookMetaForSignals {
  title: string;
  author?: string | null;
  genre?: string | null;
  tags?: string[];
  id?: number;
}

export interface DnaSignals {
  isFavoriteAuthor: boolean;
  isDislikedGenre: boolean;
  isLikedGenre: boolean;
  isHolyGrailBook: boolean;
  kryptoniteRisk: boolean;
  dislikedGenreName?: string;
  holyGrailTitle?: string;
}

function normalize(str?: string | null): string {
  return (str ?? "").trim().toLowerCase();
}

/**
 * Проверяет метаданные книги на пересечения с атрибутами читательского ДНК.
 */
export function detectDnaSignals(
  book: BookMetaForSignals,
  dna: ReadingDnaResponseData | null | undefined
): DnaSignals {
  if (!dna) {
    return {
      isFavoriteAuthor: false,
      isDislikedGenre: false,
      isLikedGenre: false,
      isHolyGrailBook: false,
      kryptoniteRisk: false,
    };
  }

  const bookAuthorNorm = normalize(book.author);
  const bookTitleNorm = normalize(book.title);
  const bookGenreNorm = normalize(book.genre);
  const bookTagsNorm = (book.tags ?? []).map((t) => normalize(t));

  // 1. Любимый автор
  const isFavoriteAuthor = Boolean(
    bookAuthorNorm &&
      (dna.favoriteAuthors ?? []).some((fa) => normalize(fa) === bookAuthorNorm)
  );

  // 2. Нежелательный жанр
  let dislikedGenreName: string | undefined;
  const isDislikedGenre = Boolean(
    (dna.dislikedGenres ?? []).some((dg) => {
      const dgNorm = normalize(dg);
      if (!dgNorm) return false;
      const matched = dgNorm === bookGenreNorm || bookTagsNorm.includes(dgNorm);
      if (matched) {
        dislikedGenreName = dg;
        return true;
      }
      return false;
    })
  );

  // 3. Любимый жанр
  const isLikedGenre = Boolean(
    (dna.likedGenres ?? []).some((lg) => {
      const lgNorm = normalize(lg);
      if (!lgNorm) return false;
      return lgNorm === bookGenreNorm || bookTagsNorm.includes(lgNorm);
    })
  );

  // 4. Книга-святыня (одна из 3 любимых)
  let holyGrailTitle: string | undefined;
  const isHolyGrailBook = Boolean(
    (dna.favoriteBooks ?? []).some((fb) => {
      if (!fb || !fb.title) return false;
      const fbTitleNorm = normalize(fb.title);
      const matched =
        fbTitleNorm === bookTitleNorm ||
        (Boolean(book.id) && Boolean(fb.bookId) && book.id === fb.bookId);
      if (matched) {
        holyGrailTitle = fb.title;
        return true;
      }
      return false;
    })
  );

  // 5. Риск криптонита
  const kryptoniteTitleNorm = normalize(dna.kryptoniteBook?.title);
  const kryptoniteAuthorNorm = normalize(dna.kryptoniteBook?.author);
  const kryptoniteRisk = Boolean(
    kryptoniteTitleNorm &&
      (kryptoniteTitleNorm === bookTitleNorm ||
        (bookAuthorNorm &&
          kryptoniteAuthorNorm &&
          kryptoniteAuthorNorm === bookAuthorNorm &&
          bookTitleNorm.includes(kryptoniteTitleNorm)))
  );

  return {
    isFavoriteAuthor,
    isDislikedGenre,
    isLikedGenre,
    isHolyGrailBook,
    kryptoniteRisk,
    dislikedGenreName,
    holyGrailTitle,
  };
}
