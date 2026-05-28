/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import { X, BookOpen, ImageOff, FileText, Calendar, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuthContext";
import { RATING_CATEGORIES, rateBook, getBookRatings, getUserBookRating } from "@/lib/ratingsApi";
import type { BookRatingsResult } from "@/lib/ratingsApi";

export interface BookViewModalProps {
  book: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (book: any) => void;
  isAdding?: boolean;
  isReadOnly?: boolean;
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
  isReadOnly = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [pollRatings, setPollRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [averages, setAverages] = useState<BookRatingsResult | null>(null);
  const [votedCategories, setVotedCategories] = useState<Record<string, number> | null>(null);
  const [voteError, setVoteError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen || !book) return;

    setImageError(false);
    setPollRatings({});
    setSubmitting(false);
    setVoteError("");
    setAverages(null);
    setHasVoted(false);
    setVotedCategories(null);

    loadRatings();
  }, [isOpen, book?.id]);

  const loadRatings = async () => {
    try {
      const [avg, mine] = await Promise.all([
        getBookRatings(book.id),
        user ? getUserBookRating(book.id) : Promise.resolve(null),
      ])

      if (avg) setAverages(avg)
      if (mine) {
        setHasVoted(true)
        setVotedCategories(mine.ratings)
      }
    } catch {
      // ignore
    }
  }

  const handleRate = (category: string, value: number) => {
    setPollRatings((prev) => ({ ...prev, [category]: value }))
  }

  const handleSubmit = async () => {
    if (!user) return
    const entries = Object.entries(pollRatings)
    if (entries.length === 0) return

    setSubmitting(true)
    setVoteError("")

    try {
      await rateBook(book.id, pollRatings)
      loadRatings()
      setHasVoted(true)
      setVotedCategories({ ...pollRatings })
    } catch (err: any) {
      if (err?.message?.includes?.("уже оценили")) {
        setVoteError("Вы уже оценили эту книгу")
        loadRatings()
      } else {
        setVoteError("Ошибка при отправке оценки")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!book) return null;

  const isSearchPreview = !!onAdd;

  const coverUrl =
    book.coverImageUrl ||
    book.image_url ||
    book.cover_image_url ||
    book.coverUrlLarge ||
    book.coverUrl;

  const pages = book.numberOfPages ?? book.number_of_pages ?? book.pageCount;
  const year = book.publishYear ?? book.publish_year;

  const allCategories = RATING_CATEGORIES.map((c) => ({
    ...c,
    userValue: pollRatings[c.key],
    avgValue: averages?.averages?.[c.key],
  }))

  const pollComplete = allCategories.some((c) => c.userValue !== undefined) &&
    allCategories.filter((c) => c.userValue !== undefined).length >= 1

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      titleId="book-view-title"
    >
      <div className="max-h-[90vh] overflow-y-auto border-2 border-black bg-[#111111] text-[#f6f1e8]">
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
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-[140px_minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <span className={`${sectionTitleClass} mb-1 sm:mb-3`}>Обложка</span>
              {coverUrl && !imageError ? (
                <img
                  src={coverUrl}
                  alt={book.title}
                  onError={() => setImageError(true)}
                  className="w-32 sm:w-full aspect-2/3 border-2 border-black object-cover shadow-lg"
                />
              ) : (
                <div className="flex w-32 sm:w-full aspect-2/3 items-center justify-center border-2 border-[#2a2a2a] bg-[#0a0a0a]">
                  <ImageOff size={32} className="text-[#444]" />
                </div>
              )}

              {averages && (
                <div className="flex flex-col items-center gap-1 mt-1">
                  <StarDisplay value={averages.overall} />
                  <span className="text-xs text-[#a0a0a0]">
                    {averages.overall.toFixed(1)}
                  </span>

                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:gap-6">
              {isSearchPreview ? (
                <div className="flex flex-col gap-4">
                  {pages != null && (
                    <div className="flex items-center gap-3 border-2 border-black bg-[#0d0d0d] p-2.5 sm:p-3">
                      <FileText size={16} className="shrink-0 text-[#c1fffe] sm:size-4.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1a3] sm:text-[11px]">
                          Количество страниц
                        </div>
                        <div className="text-sm font-semibold text-[#f6f1e8] sm:text-base">
                          {pages}
                        </div>
                      </div>
                    </div>
                  )}
                  {year != null && (
                    <div className="flex items-center gap-3 border-2 border-black bg-[#0d0d0d] p-2.5 sm:p-3">
                      <Calendar size={16} className="shrink-0 text-[#c1fffe] sm:size-4.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1a3] sm:text-[11px]">
                          Год издания
                        </div>
                        <div className="text-sm font-semibold text-[#f6f1e8] sm:text-base">
                          {year}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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

                  {book.thoughts && (
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
                    <div className="flex items-center justify-center py-8 text-[#666] text-sm">
                      Нет описания и мыслей
                    </div>
                  )}

                  {/* Rating Section */}
                  <div className="border-t-2 border-[#2a2a2a] pt-4 mt-2">
                    <span className={`${sectionTitleClass} flex items-center gap-2`}>
                      <Star size={14} />
                      Оценка книги
                    </span>

                    {isReadOnly ? (
                      averages ? (
                        <div className="space-y-2">
                          {allCategories.map((cat) => (
                            <div key={cat.key} className="flex items-center justify-between text-sm">
                              <span className="text-[#a0a0a0]">{cat.label}</span>
                              <span className="flex items-center gap-2">
                                <StarDisplay value={cat.avgValue ?? 0} size={12} />
                                <span className="text-[#f6f1e8] font-medium w-8 text-right">
                                  {cat.avgValue?.toFixed(1) ?? "—"}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#666]">Нет оценок</p>
                      )
                    ) : hasVoted ? (
                      <div className="space-y-2">
                        {allCategories.map((cat) => (
                          <div key={cat.key} className="flex items-center justify-between text-sm">
                            <span className="text-[#a0a0a0]">{cat.label}</span>
                            <span className="flex items-center gap-2">
                              <StarDisplay value={cat.avgValue ?? 0} size={12} />
                              <span className="text-[#f6f1e8] font-medium w-8 text-right">
                                {cat.avgValue?.toFixed(1) ?? "—"}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allCategories.map((cat) => (
                          <div key={cat.key}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-[#a0a0a0]">{cat.label}</span>
                              <span className="text-[#c1fffe] font-semibold">
                                {cat.userValue !== undefined ? cat.userValue.toFixed(1) : "—"}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.1}
                              max={10}
                              step={0.1}
                              value={cat.userValue ?? 0}
                              onChange={(e) => handleRate(cat.key, parseFloat(e.target.value))}
                              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                                bg-[#2a2a2a] accent-[#c1fffe]
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-4
                                [&::-webkit-slider-thumb]:h-4
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-[#c1fffe]
                                [&::-webkit-slider-thumb]:border-2
                                [&::-webkit-slider-thumb]:border-black"
                            />
                          </div>
                        ))}

                        {voteError && (
                          <div className="text-sm text-red-400">{voteError}</div>
                        )}

                        {user ? (
                          <button
                            onClick={handleSubmit}
                            disabled={!pollComplete || submitting}
                            className="w-full mt-2 py-2.5 bg-[#c1fffe] text-black font-semibold rounded-sm text-sm
                              hover:bg-[#a0f0f0] transition-colors
                              disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {submitting ? "Отправка..." : "Оценить"}
                          </button>
                        ) : (
                          <p className="text-xs text-[#666] mt-2">
                            Войдите, чтобы оценить книгу
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t-2 border-black p-3 sm:gap-3 sm:p-4 max-sm:flex-col-reverse max-sm:[&>button]:w-full">
          <Button
            variant="ghost"
            onClick={onClose}
            autoFocus={!onAdd}
            className="focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Закрыть
          </Button>
          {onAdd && (
            <Button
              isLoading={isAdding}
              onClick={() => onAdd(book)}
              className="bg-[#c1fffe] text-black hover:bg-[#a0f0f0] focus-visible:ring-2 focus-visible:ring-cyan-600"
              autoFocus
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
