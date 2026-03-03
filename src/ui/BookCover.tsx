import { memo, forwardRef, useState, useEffect, useRef } from "react";
import { X, Edit2 } from "lucide-react";
import type { Book } from "@/types";

interface BookCoverProps {
  book: Book;
  isDraggable?: boolean;
  onDelete?: (bookId: string) => void;
  onEdit?: (book: Book) => void;
  onView?: (book: Book) => void;
}

export const BookCover = memo(
  forwardRef<HTMLDivElement, BookCoverProps>(
    ({ book, isDraggable = true, onDelete, onEdit, onView }, ref) => {
      const [showActions, setShowActions] = useState(false);
      const lastTapTime = useRef<number>(0);
      const innerRef = useRef<HTMLDivElement>(null);

      const cursorClass = isDraggable
        ? "cursor-grab active:cursor-grabbing"
        : "";
      const label = `${book.title} - ${book.author}`;
      const hasActions = Boolean(onDelete || onEdit);

      const handleClick = (e: React.MouseEvent) => {
        // На десктопе не показываем кнопки по клику
        if (window.innerWidth >= 768) return;

        // На мобильных: сначала скрываем кнопки на всех других книгах
        const allBooks = document.querySelectorAll('[data-book-id]');
        allBooks.forEach(bookEl => {
          if (bookEl.getAttribute('data-book-id') !== book.id) {
            bookEl.setAttribute('data-book-actions', 'hidden');
          }
        });
        
        // Toggle на этой книге
        e.preventDefault();
        e.stopPropagation();
        setShowActions(prev => !prev);
      };

      const handleDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onView?.(book);
      };

      // Обработка двойного тапа для мобильных
      const handleTouchEnd = (e: React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          // Второй тап менее чем за 300ms = двойной тап
          handleDoubleClick(e);
        }
        lastTapTime.current = now;
      };

      // Закрываем кнопки при клике вне книги ИЛИ при клике на другую книгу
      useEffect(() => {
        if (!showActions) return;

        const handleClickOutside = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          // Проверяем, был ли клик по ЭТОЙ книге через data-book-id
          const clickedBookId = target.closest('[data-book-id]')?.getAttribute('data-book-id');
          
          if (clickedBookId === book.id) {
            return; // Клик по этой книге - не закрываем
          }
          
          // Клик по другой книге или вне книги - закрываем
          setShowActions(false);
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
      }, [showActions, book.id]);

      // Синхронизируем data-book-actions с состоянием showActions
      useEffect(() => {
        const element = innerRef.current;
        if (element) {
          element.setAttribute(
            'data-book-actions',
            showActions ? 'visible' : 'hidden'
          );
        }
      }, [showActions]);

      return (
        <div
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          style={{ backgroundImage: `url(${book.coverImageUrl})` }}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
          data-book-id={book.id}
          data-book-actions={showActions ? 'visible' : 'hidden'}
          className={`group relative aspect-2/3
                     w-20
                     md:w-20
                     sm:w-16
                     max-sm:w-12
                     overflow-hidden rounded-xl
                     border border-cyan-300/50
                     bg-cover bg-center bg-no-repeat
                     transition-[transform,border-color,box-shadow] duration-150
                     hover:-translate-y-0.5 hover:border-fuchsia-300/80 hover:shadow-[0_0_18px_rgba(255,0,204,0.35)]
                     focus-within:border-cyan-200 ${cursorClass}`}
          role="img"
          aria-label={label}
          title={label}
          onDoubleClick={() => onView?.(book)}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-[#060912]/85 to-transparent opacity-95" />

          {hasActions && (
            <div className="pointer-events-none absolute inset-0 border border-cyan-100/15" />
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(false);
                onDelete(book.id);
              }}
              className="absolute right-0 top-0 z-10 flex items-center justify-center
                         bg-fuchsia-500 text-[#05070e]
                         border border-fuchsia-300/70
                         transition-all duration-200
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         max-md:opacity-0
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto
                         md:h-5 md:min-w-5 md:px-0.5
                         sm:h-4 sm:min-w-4 sm:px-0.5
                         max-sm:h-3.5 max-sm:min-w-3.5 max-sm:px-0"
              data-visible={showActions}
              title={`Удалить "${book.title}"`}
            >
              <X
                size={8}
                className="md:w-2.5 md:h-2.5 sm:w-2 sm:h-2 max-sm:w-1.5 max-sm:h-1.5"
              />
            </button>
          )}

          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(false);
                onEdit(book);
              }}
              className="absolute right-0 bottom-0 z-10 flex items-center justify-center
                         bg-cyan-300 text-[#05070e]
                         border border-cyan-200/80
                         transition-all duration-200
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         max-md:opacity-0
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto
                         md:h-5 md:min-w-5 md:px-0.5
                         sm:h-4 sm:min-w-4 sm:px-0.5
                         max-sm:h-3.5 max-sm:min-w-3.5 max-sm:px-0"
              data-visible={showActions}
              title={`Редактировать "${book.title}"`}
            >
              <Edit2
                size={8}
                className="md:w-2.5 md:h-2.5 sm:w-2 sm:h-2 max-sm:w-1.5 max-sm:h-1.5"
              />
            </button>
          )}
        </div>
      );
    },
  ),
);

BookCover.displayName = "BookCover";
