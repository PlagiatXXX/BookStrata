import { useState } from "react";
import { X, BookOpen, Plus } from "lucide-react";
import type { OpenLibraryBook } from "@/lib/bookSearchApi";
import { Spinner } from "@/components/Spinner";

interface BookViewModalProps {
  book: OpenLibraryBook | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (book: OpenLibraryBook) => void;
  isAdding: boolean;
}

export const BookViewModal = ({
  book,
  isOpen,
  onClose,
  onAdd,
  isAdding,
}: BookViewModalProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      <div className="relative mx-4 w-full max-w-xl overflow-hidden rounded-md border-2 border-(--line-soft) bg-(--bg-1) text-(--ink-0) shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-(--line-soft) p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-sm border border-(--line-soft) bg-(--bg-0)">
              <BookOpen className="size-4 text-(--ink-1)" />
            </div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-(--ink-0)">
              Информация о книге
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-sm border border-(--line-soft) text-(--ink-1) transition-colors hover:border-(--line-strong) hover:text-(--ink-0)"
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="relative mx-auto h-60 w-40 shrink-0 overflow-hidden rounded-md border-2 border-(--line-soft) bg-(--bg-0) sm:mx-0">
              {book.coverUrl && !imageError ? (
                <>
                  {!imageLoaded && (
                    <div className="flex h-full w-full items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  )}
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className={`h-full w-full object-cover transition-opacity duration-300 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="size-10 text-(--ink-1)" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-3 text-xl font-bold tracking-[-0.02em] text-(--ink-0)">
                {book.title}
              </h3>

              <div className="space-y-2 text-sm">
                <p className="text-(--ink-1)">
                  <span className="mr-1 font-semibold uppercase tracking-[0.08em]">
                    Автор:
                  </span>
                  <span className="text-(--ink-0)">{book.author}</span>
                </p>

                {book.publishYear && (
                  <p className="text-(--ink-1)">
                    <span className="mr-1 font-semibold uppercase tracking-[0.08em]">
                      Год:
                    </span>
                    <span className="text-(--ink-0)">{book.publishYear}</span>
                  </p>
                )}

                {book.numberOfPages && (
                  <p className="text-(--ink-1)">
                    <span className="mr-1 font-semibold uppercase tracking-[0.08em]">
                      Страниц:
                    </span>
                    <span className="text-(--ink-0)">{book.numberOfPages}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {book.subjects && book.subjects.length > 0 && (
            <div className="mt-6 border-t border-(--line-soft) pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-(--ink-1)">
                Жанры
              </p>
              <div className="flex flex-wrap gap-2">
                {book.subjects.slice(0, 5).map((subject, index) => (
                  <span
                    key={index}
                    className="rounded-sm border border-(--line-soft) bg-(--bg-0) px-2.5 py-1 text-xs text-(--ink-0)"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-(--line-soft) bg-(--bg-0) p-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md border-2 border-(--line-soft) px-4 py-2 text-sm font-semibold text-(--ink-0) transition-colors hover:border-(--line-strong)"
          >
            Закрыть
          </button>
          <button
            onClick={() => onAdd(book)}
            disabled={isAdding}
            className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-(--line-strong) bg-(--ink-0) px-4 py-2 text-sm font-semibold text-(--bg-0) transition-colors hover:border-(--accent-main) hover:bg-(--accent-main) hover:text-(--ink-0) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdding ? (
              <>
                <Spinner size="sm" />
                Добавление...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Добавить в список
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
