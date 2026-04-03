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


      const handleClick = (e: React.MouseEvent) => {
        if (window.innerWidth >= 768) return;

        const allBooks = document.querySelectorAll('[data-book-id]');
        allBooks.forEach(bookEl => {
          if (bookEl.getAttribute('data-book-id') !== book.id) {
            bookEl.setAttribute('data-book-actions', 'hidden');
          }
        });
        
        e.preventDefault();
        e.stopPropagation();
        setShowActions(prev => !prev);
      };

      const handleDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onView?.(book);
      };

      const handleTouchEnd = (e: React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          handleDoubleClick(e);
        }
        lastTapTime.current = now;
      };

      useEffect(() => {
        if (!showActions) return;

        const handleClickOutside = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const clickedBookId = target.closest('[data-book-id]')?.getAttribute('data-book-id');
          if (clickedBookId !== book.id) {
            setShowActions(false);
          }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
      }, [showActions, book.id]);

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
          className={`nb-book-card group relative ${cursorClass}`}
          role="img"
          aria-label={label}
          title={label}
          onDoubleClick={() => onView?.(book)}
        >
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
                         transition-opacity duration-100
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100"
              data-visible={showActions}
              title={`Удалить "${book.title}"`}
            >
              <X size={12} />
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
                         transition-opacity duration-100
                         opacity-0
                         group-hover:opacity-100
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100"
              data-visible={showActions}
              title={`Редактировать "${book.title}"`}
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
