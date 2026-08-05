/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { X, Star, FileText, Calendar, BookOpen } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { BookRatingsResult } from "@/lib/ratingsApi";
import { getBookRatings } from "@/lib/ratingsApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";
import { RetryableImage } from "@/ui/RetryableImage";

export interface BookViewModalProps {
  book: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (book: any) => void;
  isAdding?: boolean;
  isReadOnly?: boolean;
  className?: string;
  hideThoughts?: boolean;
}

const sectionTitleClass =
  "mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-(--theme-accent-primary)";

function StarDisplay({ value, size = 16 }: { value: number; size?: number }) {
  const stars = []
  const normalized = value / 2

  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, normalized - i))
    stars.push(
      <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
        <Star size={size} className="absolute inset-0 text-(--theme-text-muted)/40" />
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          <Star size={size} className="text-amber-400" fill="#fbbf24" />
        </span>
      </span>,
    )
  }

  return <span className="inline-flex items-center gap-0.5">{stars}</span>
}

export const BookViewModal: React.FC<BookViewModalProps> = ({
  book,
  isOpen,
  onClose,
  onAdd,
  isAdding = false,
  hideThoughts = false,
  className = "",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [apiRatings, setApiRatings] = useState<BookRatingsResult | null>(null);

  // Рейтинг для отображения: из данных книги (коллекции) или с сервера
  const displayRating = book?.rating != null
    ? { count: 0, averages: {}, overall: book.rating }
    : apiRatings;

  // При открытии модалки всегда скроллим контент вверх
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo(0, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !book) return;

    // Если рейтинг уже есть в книге — API не нужен
    if (book.rating != null) return;

    const bookIdNum = Number(book.id);
    if (!Number.isFinite(bookIdNum)) return;

    getBookRatings(bookIdNum).then((result) => {
      setApiRatings(result);
    }).catch(() => { /* ignore */ });
  }, [isOpen, book]);

  if (!book) return null;

  const isSearchPreview = !!onAdd;

  const coverUrl = proxyImageUrl(
    book.coverImageUrl ||
    book.image_url ||
    book.cover_image_url ||
    book.coverUrlLarge ||
    book.coverUrl
  );

  const pages = book.numberOfPages ?? book.number_of_pages ?? book.pageCount;
  const year = book.publishYear ?? book.publish_year;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      titleId="book-view-title"
      className={className}
    >
        <div
          ref={scrollRef}
          className="max-h-[90dvh] overflow-y-auto nb-heavy-border bg-(--theme-surface-3) text-(--theme-text)"
        >
          <div className="relative border-b-(--theme-border-width) border-(--theme-border) p-4 sm:p-6">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-sm nb-heavy-border bg-(--theme-surface-4) p-1 text-(--theme-text) transition-colors hover:border-(--theme-accent-primary) hover:text-(--theme-accent-primary) focus-visible:ring-2 focus-visible:ring-(--theme-focus) focus:outline-none sm:right-4 sm:top-4"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
            <h3
              id="book-view-title"
              className="pr-10 text-base font-black leading-tight sm:pr-12 sm:text-xl md:text-2xl"
            >
              {book.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-(--theme-text-muted) sm:text-sm">
              {book.author || book.author_name || "Автор неизвестен"}
            </p>
            {book.genre && (
              <p className="mt-1 text-xs text-(--theme-accent-primary)">
                {book.genre}
              </p>
            )}
            {book.tags && book.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {book.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-(--theme-accent-primary)/30 bg-(--theme-accent-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--theme-accent-primary)"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-5 sm:gap-6 sm:grid-cols-[120px_minmax(0,1fr)] lg:grid-cols-[140px_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                {coverUrl && !imageError ? (
                  <RetryableImage
                    src={coverUrl}
                    alt={book.title}
                    onError={() => setImageError(true)}
                    className="w-28 sm:w-full aspect-2/3 nb-heavy-border object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-28 sm:w-full aspect-2/3 border-2 border-(--theme-surface-2) overflow-hidden">
                    <BookCoverPlaceholder />
                  </div>
                )}

                {displayRating && (
                  <div className="flex flex-col items-center gap-0.5">
                    <StarDisplay value={displayRating.overall} />
                    <span className="text-[11px] text-(--theme-text-muted)">
                      {displayRating.overall.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Компактные метаданные: страницы и год всегда под обложкой */}
                {isSearchPreview && (
                  <div className="w-full space-y-1.5 mt-1">
                    {pages != null && (
                      <div className="flex items-center gap-2 text-xs text-(--theme-text-muted)">
                        <FileText size={12} className="shrink-0 text-(--theme-accent-primary)" />
                        <span>{pages} стр.</span>
                      </div>
                    )}
                    {year != null && (
                      <div className="flex items-center gap-2 text-xs text-(--theme-text-muted)">
                        <Calendar size={12} className="shrink-0 text-(--theme-accent-primary)" />
                        <span>{year} г.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 sm:gap-5">
                {isSearchPreview ? (
                  <p className="text-sm leading-relaxed text-(--theme-text-muted)">
                    Нажмите «Добавить», чтобы включить книгу в тир-лист
                  </p>
                ) : (
                  <>
                    {book.description && (
                      <div>
                        <span className={sectionTitleClass}>Описание</span>
                        <p className="text-sm leading-relaxed text-(--theme-text)/90">
                          {book.description}
                        </p>
                      </div>
                    )}

                    {!hideThoughts && book.thoughts && (
                      <div>
                        <span
                          className={`${sectionTitleClass} flex items-center gap-2`}
                        >
                          <BookOpen size={14} />
                          Мысли о книге
                        </span>
                        <div className="border-l-4 border-(--theme-accent-primary) bg-(--theme-surface-4) p-4">
                          <p className="text-sm leading-relaxed text-(--theme-text)">
                            {book.thoughts}
                          </p>
                        </div>
                      </div>
                    )}

                    {!book.description && !book.thoughts && (
                      <p className="py-6 text-center text-sm text-(--theme-text-muted)">
                        Нет описания и мыслей
                      </p>
                    )}


                  </>
                )}
              </div>
            </div>
          </div>

        <div className="flex items-center justify-end gap-2 border-t-(--theme-border-width) border-(--theme-border) px-5 py-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-sm focus-visible:ring-2 focus-visible:ring-(--theme-focus)"
          >
            Закрыть
          </Button>
          {onAdd && (
            <Button
              isLoading={isAdding}
              onClick={() => onAdd(book)}
              size="sm"
              className="bg-(--theme-accent-primary) text-(--theme-on-accent) hover:bg-(--theme-accent-primary)/85 text-xs font-black focus-visible:ring-2 focus-visible:ring-(--theme-focus)"
              aria-label="Добавить в тир-лист"
            >
              Добавить
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
