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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        role="button"
        tabIndex={0}
        className="absolute inset-0 cursor-pointer bg-black/78"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
        aria-label="Закрыть модальное окно"
      />

      <div className="relative mx-4 w-full max-w-2xl overflow-hidden border-2 border-black bg-[#111111] text-[#f6f1e8] shadow-[8px_8px_0_0_#000000]">
        <div className="flex items-center justify-between border-b-2 border-black bg-[#181818] p-5">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
            <div className="row-span-2 flex size-10 items-center justify-center border-2 border-black bg-[#c1fffe] text-black">
              <BookOpen className="size-4" />
            </div>
            <p className="col-start-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]">
              Карточка книги
            </p>
            <h2 className="col-start-2 text-xl font-black tracking-[-0.02em] text-[#f6f1e8]">
              Информация о книге
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8]"
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-[#111111] p-6">
          <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="border-2 border-black bg-[#171717] p-3">
              <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]">
                Обложка
              </p>
              <div className="mx-auto h-64 w-40 overflow-hidden border-2 border-black bg-[#0a0a0a]">
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
                    <BookOpen className="size-10 text-[#6f7577]" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <section className="border-2 border-black bg-[#171717] p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]">
                  Основное
                </p>
                <h3 className="mb-3 text-2xl font-black tracking-[-0.03em] text-[#f6f1e8]">
                  {book.title}
                </h3>
                <div className="space-y-2 text-sm text-[#b1b5b6]">
                  <p>
                    <span className="mr-2 font-bold uppercase tracking-[0.08em] text-[#8d9496]">
                      Автор
                    </span>
                    <span className="text-[#f6f1e8]">{book.author}</span>
                  </p>

                  {book.publishYear && (
                    <p>
                      <span className="mr-2 font-bold uppercase tracking-[0.08em] text-[#8d9496]">
                        Год
                      </span>
                      <span className="text-[#f6f1e8]">{book.publishYear}</span>
                    </p>
                  )}

                  {book.numberOfPages && (
                    <p>
                      <span className="mr-2 font-bold uppercase tracking-[0.08em] text-[#8d9496]">
                        Страниц
                      </span>
                      <span className="text-[#f6f1e8]">{book.numberOfPages}</span>
                    </p>
                  )}
                </div>
              </section>

              {book.subjects && book.subjects.length > 0 ? (
                <section className="border-2 border-black bg-[#171717] p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]">
                    Жанры
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {book.subjects.slice(0, 6).map((subject, index) => (
                      <span
                        key={`${subject}-${index}`}
                        className="border-2 border-black bg-[#0a0a0a] px-2.5 py-1 text-xs text-[#f6f1e8]"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t-2 border-black bg-[#0a0a0a] p-5 max-sm:flex-col-reverse">
          <button
            onClick={onClose}
            className="cursor-pointer border-2 border-black bg-transparent px-5 py-2.5 text-sm font-semibold text-[#b4b4b4] transition-colors hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8]"
          >
            Закрыть
          </button>
          <button
            onClick={() => onAdd(book)}
            disabled={isAdding}
            className="flex cursor-pointer items-center justify-center gap-2 border-2 border-black bg-[#c1fffe] px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:opacity-100"
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
