import { memo, forwardRef, useState, useEffect, useRef } from "react";
import { X, Edit2, Eye } from "lucide-react";
import type { Book } from "@/types";
import type { ReadStatus } from "@/hooks/useReadStatus";
import { proxyImageUrl } from "@/utils/imageProxy";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";

interface BookCoverProps {
  book: Book;
  isDraggable?: boolean;
  onDelete?: (bookId: string) => void;
  onEdit?: (book: Book) => void;
  onView?: (book: Book) => void;
  readStatus?: ReadStatus | null;
  onToggleStatus?: () => void;
}

export const BookCover = memo(
  forwardRef<HTMLDivElement, BookCoverProps>(
    ({ book, isDraggable = true, onDelete, onEdit, onView, readStatus, onToggleStatus }, ref) => {
      const [showActions, setShowActions] = useState(false);
      const [isHovered, setIsHovered] = useState(false);
      const [coverError, setCoverError] = useState(false);
      const lastTapTime = useRef<number>(0);
      const innerRef = useRef<HTMLDivElement>(null);

      const cursorClass = isDraggable
        ? "cursor-grab active:cursor-grabbing"
        : "";
      const label = `${book.title} - ${book.author}`;
      const hasActions = Boolean(onDelete || onEdit || onView);
      const showActionsFinal = isHovered || showActions;

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

      // Синхронизируем data-book-actions с состоянием showActionsFinal
      useEffect(() => {
        const element = innerRef.current;
        if (element) {
          element.setAttribute(
            "data-book-actions",
            showActionsFinal ? "visible" : "hidden",
          );
        }
      }, [showActionsFinal]);

      const hasCover = !!book.coverImageUrl;

      // Сбрасываем ошибку загрузки при смене URL
      useEffect(() => {
        if (!hasCover) return;

        const img = new Image();
        img.onload = () => setCoverError(false);
        img.onerror = () => setCoverError(true);
        img.src = proxyImageUrl(book.coverImageUrl);

        return () => {
          img.onload = null;
          img.onerror = null;
        };
      }, [book.coverImageUrl, hasCover]);

      const showCover = hasCover && !coverError;
      const bgImageUrl = showCover ? proxyImageUrl(book.coverImageUrl) : undefined;

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
          style={bgImageUrl ? { backgroundImage: `url(${bgImageUrl})` } : undefined}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          data-book-id={book.id}
          data-book-actions={showActionsFinal ? "visible" : "hidden"}
          className={`nb-book-card relative ${cursorClass}`}
          role={showCover ? "img" : undefined}
          aria-label={showCover ? label : undefined}
          onDoubleClick={() => onView?.(book)}
        >
          {showCover && hasActions && (
            <div className="pointer-events-none absolute inset-0 border border-[#c1fffe]/15" />
          )}

          {/* Read status badge — плашка снизу с текстом */}
          {onToggleStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleStatus();
              }}
              className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 flex h-5 items-center justify-center gap-1
                         rounded-t px-2
                         bg-black/70 text-[9px] font-bold uppercase leading-none tracking-wider
                         transition-all duration-150
                         hover:bg-black/90 hover:h-6
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-auto"
              title={readStatus === "read" ? "Прочитал" : "Нажмите, чтобы отметить книгу как прочитанную"}
              aria-label={readStatus === "read" ? "Убрать отметку" : "Отметить как прочитанное"}
            >
              {readStatus === "read" ? (
                <>
                  <span className="text-green-400 leading-none">✓</span>
                  <span className="text-green-300">Прочитал</span>
                </>
              ) : (
                <span className="text-(--ink-3) leading-none">+ Отметить</span>
              )}
            </button>
          )}

          {!showCover && (
            <div className="absolute inset-0">
              <BookCoverPlaceholder compact />
            </div>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsHovered(false);
                setShowActions(false);
                onDelete(book.id);
              }}
              className="absolute right-0 top-0 z-10 flex size-6 items-center justify-center
                         bg-[#ff51fa] text-black
                         nb-heavy-border border-b-0 border-r-0
                         transition-all duration-200
                         opacity-0
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto"
              data-visible={showActionsFinal}
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
              className="absolute left-0 top-0 z-10 flex size-6 items-center justify-center
                         bg-[#ffbd58] text-black
                         nb-heavy-border border-b-0 border-l-0
                         transition-all duration-200
                         opacity-0
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto"
              data-visible={showActionsFinal}
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
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:z-20
                         max-md:pointer-events-none max-md:data-[visible=true]:pointer-events-auto"
              data-visible={showActionsFinal}
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
