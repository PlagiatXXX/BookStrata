import { X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { Book } from "@/types";

interface BookViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
}

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-1)]";

export const BookViewModal = ({
  isOpen,
  onClose,
  book,
}: BookViewModalProps) => {
  if (!book) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" titleId="book-details-title">
      <div className="relative flex max-h-[90vh] w-full flex-col gap-5 bg-(--bg-1) p-6 text-(--ink-0)">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 cursor-pointer items-center justify-center rounded-sm border border-[var(--line-soft)] text-[var(--ink-1)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink-0)]"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="pr-12">
          <h2 id="book-details-title" className="text-2xl font-bold tracking-[-0.02em] text-(--ink-0)">
            {book.title}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-6 md:flex-row">
            <div
              className="h-56 w-40 shrink-0 rounded-md border-2 border-(--line-soft) bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${book.coverImageUrl})` }}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="flex min-w-0 flex-col gap-2">
                <span className={labelClass}>Автор</span>
                <p className="wrap-break-word text-sm text-(--ink-0)">
                  {book.author}
                </p>
              </div>

              {book.description && book.description.trim() && (
                <div className="flex min-w-0 flex-col gap-2">
                  <span className={labelClass}>Описание</span>
                  <p className="whitespace-pre-wrap wrap-break-word text-sm text-(--ink-0)">
                    {book.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {book.thoughts && book.thoughts.trim() && (
            <div className="mt-6 flex min-w-0 flex-col gap-2 border-t border-(--line-soft) pt-5">
              <span className={labelClass}>Мои мысли</span>
              <p className="whitespace-pre-wrap wrap-break-word text-sm text-(--ink-0)">
                {book.thoughts}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-(--line-soft) pt-4">
          <Button variant="primary" onClick={onClose} className="rounded-md">
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
};
