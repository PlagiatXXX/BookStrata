/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { X, Star, FileText, Calendar, BookOpen } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { BookRatingsResult } from "@/lib/ratingsApi";
import { getBookRatings } from "@/lib/ratingsApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";

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
  "mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]";

function StarDisplay({ value, size = 16 }: { value: number; size?: number }) {
  const stars = []
  const normalized = value / 2

  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, normalized - i))
    stars.push(
      <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
        <Star size={size} className="absolute inset-0 text-[#444]" />
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
          className="max-h-[90vh] overflow-y-auto border-2 border-black bg-[#111111] text-[#f6f1e8]"
        >
          <div className="relative border-b-2 border-black p-4 sm:p-6">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-sm border-2 border-black bg-[#1a1a1a] p-1 text-[#f6f1e8] transition-colors hover:border-[#c1fffe] hover:text-[#c1fffe] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none sm:right-4 sm:top-4"
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
            <p className="mt-1 text-xs font-medium text-[#a0a0a0] sm:text-sm">
              {book.author || book.author_name || "Автор неизвестен"}
            </p>
            {book.genre && (
              <p className="mt-1 text-xs text-[#c1fffe]">
                {book.genre}
              </p>
            )}
            {book.tags && book.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {book.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300"
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
                  <img
                    src={coverUrl}
                    alt={book.title}
                    onError={() => setImageError(true)}
                    className="w-28 sm:w-full aspect-2/3 border-2 border-black object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-28 sm:w-full aspect-2/3 border-2 border-[#2a2a2a] overflow-hidden">
                    <BookCoverPlaceholder />
                  </div>
                )}

                {displayRating && (
                  <div className="flex flex-col items-center gap-0.5">
                    <StarDisplay value={displayRating.overall} />
                    <span className="text-[11px] text-[#a0a0a0]">
                      {displayRating.overall.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Компактные метаданные: страницы и год всегда под обложкой */}
                {isSearchPreview && (
                  <div className="w-full space-y-1.5 mt-1">
                    {pages != null && (
                      <div className="flex items-center gap-2 text-xs text-[#a0a0a0]">
                        <FileText size={12} className="shrink-0 text-[#c1fffe]" />
                        <span>{pages} стр.</span>
                      </div>
                    )}
                    {year != null && (
                      <div className="flex items-center gap-2 text-xs text-[#a0a0a0]">
                        <Calendar size={12} className="shrink-0 text-[#c1fffe]" />
                        <span>{year} г.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 sm:gap-5">
                {isSearchPreview ? (
                  <p className="text-sm leading-relaxed text-[#a0a0a0]">
                    Нажмите «Добавить», чтобы включить книгу в тир-лист
                  </p>
                ) : (
                  <>
                    {book.description && (
                      <div>
                        <span className={sectionTitleClass}>Описание</span>
                        <p className="text-sm leading-relaxed text-[#d0d0d0]">
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
                        <div className="border-l-4 border-[#c1fffe] bg-[#0a0a0a] p-4">
                          <p className="text-sm leading-relaxed text-[#e0e0e0]">
                            {book.thoughts}
                          </p>
                        </div>
                      </div>
                    )}

                    {!book.description && !book.thoughts && (
                      <p className="py-6 text-center text-sm text-[#555]">
                        Нет описания и мыслей
                      </p>
                    )}


                  </>
                )}
              </div>
            </div>
          </div>

        <div className="flex items-center justify-end gap-2 border-t-2 border-black px-5 py-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-sm focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Закрыть
          </Button>
          {onAdd && (
            <Button
              isLoading={isAdding}
              onClick={() => onAdd(book)}
              size="sm"
              className="bg-[#c1fffe] text-black hover:bg-[#a0f0f0] text-xs font-black focus-visible:ring-2 focus-visible:ring-cyan-600"
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
