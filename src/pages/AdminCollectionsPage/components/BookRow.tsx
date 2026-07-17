import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Edit3, Trash2 } from "lucide-react";
import type { CuratedBook, CuratedTier } from "./types";

interface BookRowProps {
  book: CuratedBook;
  tiers: CuratedTier[];
  onUpdate: (id: string, field: keyof CuratedBook, value: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (bookId: string, newTierId: string | null) => void;
  onEdit: (book: CuratedBook) => void;
  draggable?: boolean;
}

export const BookRow = memo(function BookRow({
  book,
  tiers,
  onUpdate,
  onDelete,
  onMove,
  onEdit,
  draggable,
}: BookRowProps) {
  const titleEmpty = !book.title.trim();
  const isNew = !book.title && !book.author;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `book-${book.id}`,
    data: { bookId: book.id, type: "curated-book" },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : { opacity: isDragging ? 0.4 : 1 };

  const rowRef = setNodeRef;

  return (
    <div
      ref={rowRef}
      style={style}
      className={`curated-editor-book-row ${isNew ? "new" : ""} ${isDragging ? "curated-editor-book-row--dragging" : ""}`}
    >
      {draggable && (
        <button
          type="button"
          className="curated-editor-drag-handle"
          {...attributes}
          {...listeners}
          title="Перетащить в другой уровень"
          aria-label="Перетащить в другой уровень"
          tabIndex={-1}
        >
          <GripVertical size={14} />
        </button>
      )}
      <div className="curated-editor-book-fields">
        <div className="curated-editor-book-row-main">
          <input
            type="text"
            className="curated-editor-input"
            value={book.author}
            onChange={(e) => onUpdate(book.id, "author", e.target.value)}
            placeholder="Автор"
          />
          <input
            type="text"
            className={`curated-editor-input ${titleEmpty ? "curated-editor-input--error" : ""}`}
            value={book.title}
            onChange={(e) => onUpdate(book.id, "title", e.target.value)}
            placeholder="Название книги *"
            required
          />
        </div>
        <div className="curated-editor-book-row-meta">
          {tiers.length > 0 && (
            <select
              className="curated-editor-select"
              value={book.tierId ?? ""}
              onChange={(e) => onMove(book.id, e.target.value || null)}
            >
              <option value="">Без уровня</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            className="curated-editor-input"
            value={book.coverImageUrl}
            onChange={(e) => onUpdate(book.id, "coverImageUrl", e.target.value)}
            placeholder="URL обложки"
          />
          <input
            type="number"
            className="curated-editor-input curated-editor-input--rating"
            value={book.rating ?? ""}
            onChange={(e) => onUpdate(book.id, "rating", e.target.value ? String(Number(e.target.value)) : "")}
            placeholder="Оценка"
            min={1}
            max={10}
            step={0.1}
            style={{ width: 80 }}
          />
          <div className="curated-editor-book-actions">
            <button
              type="button"
              className="curated-editor-edit-btn"
              onClick={() => onEdit(book)}
              title="Редактировать"
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              className="curated-editor-delete-btn"
              onClick={() => onDelete(book.id)}
              title="Удалить книгу"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      {book.coverImageUrl && (
        <div className="curated-editor-book-cover-preview">
          <img
            src={book.coverImageUrl}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
});
