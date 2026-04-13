import { memo, forwardRef, useState, useEffect, useRef } from "react";
import { X, Edit2, Eye } from "lucide-react";
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
      const hasActions = Boolean(onDelete || onEdit || onView);

      const handleClick = (e: React.MouseEvent) => {
        // На десктопе не показываем кнопки по клику
        if (window.innerWidth >= 768) return;

        // На мобильных: сначала скрываем кнопки на всех других книгах
        const allBooks = document.querySelectorAll("[data-book-id]");
        allBooks.forEach((bookEl) => {
          if (bookEl.getAttribute("data-book-id") !== book.id) {
            bookEl.setAttribute("data-book-actions", "hidden");
          }
        });

        // Toggle на этой книге
        e.preventDefault();
        e.stopPropagation();
        setShowActions((prev) => !prev);
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
          handleDoubleClick(e);
        }
        lastTapTime.current = now;
      };

      // Закрываем кнопки при клике вне книги ИЛИ при клике на другую книгу
      useEffect(() => {
        if (!showActions) return;

        const handleClickOutside = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const clickedBookId = target
            .closest("[data-book-id]")
            ?.getAttribute("data-book-id");

          if (clickedBookId === book.id) {
            return; // Клик по этой книге - не закрываем
          }

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
            "data-book-actions",
            showActions ? "visible" : "hidden",
          );
        }
      }, [showActions]);

      return (
        <div
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          style={{ backgroundImage: `url(${book.coverImageUrl})` }}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
          data-book-id={book.id}
          data-book-actions={showActions ? "visible" : "hidden"}
          className={`nb-book-card group relative ${cursorClass}`}
          role="img"
          aria-label={label}
          title={label}
          onDoubleClick={() => onView?.(book)}
        >
          {hasActions && (
            <div className="pointer-events-none absolute inset-0 border border-[#c1fffe]/15" />
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(false);
                onDelete(book.id);
              }}
              className="absolute right-0 top-0 z-10 flex size-6 items-center justify-center
                         bg-[#ff51fa] text-black
                         nb-heavy-border border-b-0 border-r-0
                         transition-all duration-200
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         focus-within:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto"
              data-visible={showActions}
              title={`Удалить "${book.title}"`}
              aria-label={`Удалить "${book.title}"`}
            >
              <X size={12} />
            </button>
          )}

          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(false);
                onView(book);
              }}
              className="absolute left-0 bottom-0 z-10 flex size-6 items-center justify-center
                         bg-[#ffbd58] text-black
                         nb-heavy-border border-t-0 border-l-0
                         transition-all duration-200
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         focus-within:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto"
              data-visible={showActions}
              title={`Просмотреть "${book.title}"`}
              aria-label={`Просмотреть "${book.title}"`}
            >
              <Eye size={12} />
            </button>
          )}

          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(false);
                onEdit(book);
              }}
              className="absolute right-0 bottom-0 z-10 flex size-6 items-center justify-center
                         bg-[#c1fffe] text-black
                         nb-heavy-border border-t-0 border-r-0
                         transition-all duration-200
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         focus-within:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto"
              data-visible={showActions}
              title={`Редактировать "${book.title}"`}
              aria-label={`Редактировать "${book.title}"`}
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
      );
    },
  ),
);

BookCover.displayName = "BookCover";
