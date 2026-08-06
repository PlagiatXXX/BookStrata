import { memo, forwardRef, useState, useRef, useCallback, useEffect } from "react";
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
  /** Если true — ставит fetchpriority="high" (для first-view книг) */
  priority?: boolean;
}

/** Сколько раз повторно пытаемся загрузить обложку после сетевого обрыва */
const MAX_COVER_RETRIES = 2;

/**
 * Порог смещения указателя от точки нажатия.
 * Если курсор сдвинулся дальше — это было перетаскивание (drag),
 * а не клик, открывать книгу не нужно.
 * Совпадает с activationConstraint { distance: 8 } у dnd-kit в редакторе.
 */
const CLICK_MOVE_THRESHOLD = 8;

/** Меняет src при ретрае, чтобы браузер не взял закэшированную ошибку */
function withRetryParam(url: string, attempt: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}bs_retry=${attempt}`;
}

export const BookCover = memo(
  forwardRef<HTMLDivElement, BookCoverProps>(
    ({ book, isDraggable = true, onDelete, onEdit, onView, readStatus, onToggleStatus, priority = false }, ref) => {
      const [showActions, setShowActions] = useState(false);
      const [isHovered, setIsHovered] = useState(false);
      const [coverError, setCoverError] = useState(false);
      const [retryCount, setRetryCount] = useState(0);
      const lastTapTime = useRef<number>(0);
      const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
      const innerRef = useRef<HTMLDivElement>(null);

      const cursorClass = isDraggable
        ? "cursor-grab active:cursor-grabbing"
        : "";
      const label = `${book.title} - ${book.author}`;
      const hasActions = Boolean(onDelete || onEdit || onView);
      // На мобильных браузер синтезирует mouseenter после тапа —
      // hover-состояние мешает закрытию кнопок, поэтому учитываем его только на десктопе
      const isMobile = window.innerWidth < 768;
      const showActionsFinal = isMobile
        ? showActions
        : isHovered || showActions;
      const hasCover = !!book.coverImageUrl;
      const showCover = hasCover && !coverError;
      const baseImgUrl = hasCover ? proxyImageUrl(book.coverImageUrl) : undefined;

      // Сброс при смене книги (компонент переиспользуется, например в длинных
      // списках без key). Паттерн «storing information from previous renders».
      const [prevCoverUrl, setPrevCoverUrl] = useState<typeof baseImgUrl>(baseImgUrl);
      if (baseImgUrl !== prevCoverUrl) {
        setPrevCoverUrl(baseImgUrl);
        setRetryCount(0);
        setCoverError(false);
      }

      const imgUrl = showCover && baseImgUrl
        ? retryCount > 0
          ? withRetryParam(baseImgUrl, retryCount)
          : baseImgUrl
        : undefined;

      // Обрыв сети на мобильных — частая история: первая попытка падает,
      // картинка на самом деле доступна. Пробуем ещё раз с новым src,
      // и только потом окончательно показываем placeholder.
      const handleCoverError = () => {
        setRetryCount((prev) => {
          if (prev >= MAX_COVER_RETRIES) {
            setCoverError(true);
            return prev;
          }
          return prev + 1;
        });
      };

      const handleCoverLoad = () => {
        // Не сбрасываем retryCount: если обложка загрузилась через ретрай
        // (с ?bs_retry=N), в кэше браузера зафиксирован именно этот URL
        // (Cache-Control: immutable). Оставляем его в DOM, чтобы следующий
        // показ взял обложку из кэша, а не снова падал на каноничном URL.
      };

      const handlePointerDown = (e: React.PointerEvent) => {
        // Запоминаем точку нажатия, чтобы в click отличить клик от drag
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
      };

      const handleClick = (e: React.MouseEvent) => {
        if (window.innerWidth >= 768) {
          // Десктоп: одиночный клик открывает книгу.
          // Защита от ложного срабатывания после drag-n-drop: если курсор
          // сдвинулся от точки нажатия дальше порога — это перетаскивание,
          // а не клик, открывать не нужно.
          const pos = pointerDownPos.current;
          if (!pos) return;
          if (
            Math.abs(e.clientX - pos.x) > CLICK_MOVE_THRESHOLD ||
            Math.abs(e.clientY - pos.y) > CLICK_MOVE_THRESHOLD
          ) {
            return;
          }
          onView?.(book);
          return;
        }

        // Мобильные: переключение кнопок действий
        e.preventDefault();
        setShowActions((prev) => !prev);
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

      const handleClickOutside = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const clickedBookId = target
          .closest("[data-book-id]")
          ?.getAttribute("data-book-id");

        if (clickedBookId === book.id) return;
        setShowActions(false);
      }, [book.id]);

      // Закрываем кнопки при клике вне книги (в т.ч. по другой книге
      // или пустому месту). Подписываемся только пока кнопки открыты.
      useEffect(() => {
        if (!showActions) return;
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
      }, [showActions, handleClickOutside]);

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
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          data-book-id={book.id}
          data-book-actions={showActionsFinal ? "visible" : "hidden"}
          className={`nb-book-card relative ${cursorClass}`}
          data-testid="book-cover"
        >
          {showCover ? (
            <img
              src={imgUrl}
              alt={`Обложка: ${label}`}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              onError={handleCoverError}
              onLoad={handleCoverLoad}
              className="pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0">
              <BookCoverPlaceholder compact />
            </div>
          )}

          {showCover && hasActions && (
            <div className="pointer-events-none absolute inset-0 border border-(--theme-accent-primary)/15" />
          )}

          {/* Read status badge */}
          {onToggleStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleStatus();
              }}
              className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 flex h-5 items-center justify-center gap-1
                         rounded-t px-2
                         bg-(--theme-border)/70 text-[9px] font-bold uppercase leading-none tracking-wider
                         transition-all duration-150
                         hover:bg-(--theme-border)/90 hover:h-6
                         focus-visible:ring-2 focus-visible:ring-(--theme-focus) focus-visible:z-20
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

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsHovered(false);
                setShowActions(false);
                onDelete(book.id);
              }}
              className="absolute right-0 top-0 z-10 flex size-6 items-center justify-center
                         bg-(--theme-accent-secondary) text-(--theme-on-accent)
                         nb-heavy-border border-b-0 border-r-0
                         transition-all duration-200
                         opacity-0
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-(--theme-focus) focus-visible:z-20
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
                         bg-(--theme-accent-tertiary) text-(--theme-on-accent)
                         nb-heavy-border border-b-0 border-l-0
                         transition-all duration-200
                         opacity-0
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-(--theme-focus) focus-visible:z-20
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
                         bg-(--theme-accent-primary) text-(--theme-on-accent)
                         nb-heavy-border border-t-0 border-r-0
                         transition-all duration-200
                         opacity-0
                         focus-visible:opacity-100
                         data-[visible=true]:opacity-100
                         hover:scale-105
                         focus-visible:ring-2 focus-visible:ring-(--theme-focus) focus-visible:z-20
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
