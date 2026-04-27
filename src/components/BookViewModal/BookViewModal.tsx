/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import { X, BookOpen, ImageOff } from "lucide-react";

export interface BookViewModalProps {
  book: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (book: any) => void;
  isAdding?: boolean;
}

const sectionTitleClass =
  "mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]";

export const BookViewModal: React.FC<BookViewModalProps> = ({
  book,
  isOpen,
  onClose,
  onAdd,
  isAdding = false,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!book) return null;

  const coverUrl = book.coverImageUrl || book.image_url || book.cover_image_url;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      titleId="book-view-title"
    >
      <div className="max-h-[90vh] overflow-y-auto border-2 border-black bg-[#111111] text-[#f6f1e8]">
        {/* HEADER */}
        <div className="relative border-b-2 border-black p-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm border-2 border-black bg-[#1a1a1a] p-1 text-[#f6f1e8] transition-colors hover:border-[#c1fffe] hover:text-[#c1fffe] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>

          <h3
            id="book-view-title"
            className="text-xl font-black leading-tight md:text-2xl"
          >
            {book.title}
          </h3>
          <p className="mt-1 text-sm font-medium text-[#a0a0a0]">
            {book.author || book.author_name || "Автор неизвестен"}
          </p>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
            {/* Cover */}
            <div className="flex flex-col items-center gap-3">
              <span className={sectionTitleClass}>Обложка</span>
              {coverUrl && !imageError ? (
                <img
                  src={coverUrl}
                  alt={book.title}
                  onError={() => setImageError(true)}
                  className="w-full aspect-2/3 border-2 border-black object-cover shadow-lg"
                />
              ) : (
                <div className="flex w-full aspect-2/3 items-center justify-center border-2 border-[#2a2a2a] bg-[#0a0a0a]">
                  <ImageOff size={32} className="text-[#444]" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-6">
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
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 border-t-2 border-black p-4 max-md:flex-col-reverse">
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
