import { useState, useCallback, useMemo, memo } from "react";
import { Plus, Trash2, Edit3, X } from "lucide-react";

export interface CuratedTier {
  id: string;
  title: string;
  color: string;
}

export interface CuratedBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  description?: string;
  rating?: number;
  genre?: string;
  tags?: string;
  tierId: string | null; // null = unranked
}

interface CuratedCollectionEditorProps {
  tiers: CuratedTier[];
  books: CuratedBook[];
  onTiersChange: (tiers: CuratedTier[]) => void;
  onBooksChange: (books: CuratedBook[]) => void;
}

let nextId = 1;
function genId(): string {
  return `curated_${nextId++}_${Date.now()}`;
}

const TIER_COLORS = [
  { label: "Красный", value: "#ef4444" },
  { label: "Оранжевый", value: "#f97316" },
  { label: "Жёлтый", value: "#eab308" },
  { label: "Зелёный", value: "#22c55e" },
  { label: "Голубой", value: "#06b6d4" },
  { label: "Синий", value: "#3b82f6" },
  { label: "Фиолетовый", value: "#8b5cf6" },
  { label: "Розовый", value: "#ec4899" },
  { label: "Серый", value: "#64748b" },
  { label: "Белый", value: "#f8fafc" },
];

export function CuratedCollectionEditor({
  tiers,
  books,
  onTiersChange,
  onBooksChange,
}: CuratedCollectionEditorProps) {
  const [editingBook, setEditingBook] = useState<CuratedBook | null>(null);
  const [editForm, setEditForm] = useState<CuratedBook | null>(null);

  // Добавить тир
  const handleAddTier = useCallback(() => {
    const newTier: CuratedTier = {
      id: genId(),
      title: `Уровень ${tiers.length + 1}`,
      color: TIER_COLORS[tiers.length % TIER_COLORS.length].value,
    };
    onTiersChange([...tiers, newTier]);
  }, [tiers, onTiersChange]);

  // Обновить тир
  const handleUpdateTier = useCallback(
    (id: string, field: keyof CuratedTier, value: string) => {
      onTiersChange(
        tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
      );
    },
    [tiers, onTiersChange],
  );

  // Удалить тир
  const handleDeleteTier = useCallback(
    (id: string) => {
      // Книги из удаляемого тира становятся unranked
      onBooksChange(
        books.map((b) => (b.tierId === id ? { ...b, tierId: null } : b)),
      );
      onTiersChange(tiers.filter((t) => t.id !== id));
    },
    [tiers, books, onTiersChange, onBooksChange],
  );

  // Добавить книгу
  const handleAddBook = useCallback(() => {
    const newBook: CuratedBook = {
      id: genId(),
      title: "",
      author: "",
      coverImageUrl: "",
      description: "",
      rating: undefined,
      genre: "",
      tags: "",
      tierId: tiers.length > 0 ? tiers[0].id : null,
    };
    onBooksChange([...books, newBook]);
  }, [books, tiers, onBooksChange]);

  // Обновить книгу (поле)
  const handleUpdateBook = useCallback(
    (id: string, field: keyof CuratedBook, value: string | null) => {
      onBooksChange(
        books.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
      );
    },
    [books, onBooksChange],
  );

  // Удалить книгу
  const handleDeleteBook = useCallback(
    (id: string) => {
      onBooksChange(books.filter((b) => b.id !== id));
    },
    [books, onBooksChange],
  );

  // Переместить книгу между тирами
  const handleMoveBook = useCallback(
    (bookId: string, newTierId: string | null) => {
      onBooksChange(
        books.map((b) => (b.id === bookId ? { ...b, tierId: newTierId } : b)),
      );
    },
    [books, onBooksChange],
  );

  // Открыть модалку редактирования книги
  const handleOpenEdit = useCallback((book: CuratedBook) => {
    setEditingBook(book);
    setEditForm({ ...book });
  }, []);

  // Сохранить изменения из модалки
  const handleSaveEdit = useCallback(() => {
    if (!editingBook || !editForm) return;
    onBooksChange(
      books.map((b) => (b.id === editingBook.id ? { ...editForm } : b)),
    );
    setEditingBook(null);
    setEditForm(null);
  }, [editingBook, editForm, books, onBooksChange]);

  // Закрыть модалку без сохранения
  const handleCloseEdit = useCallback(() => {
    setEditingBook(null);
    setEditForm(null);
  }, []);

  // Группируем книги по тирам
  const booksByTier = useMemo(() => {
    const grouped: Record<string, CuratedBook[]> = {};
    const unranked: CuratedBook[] = [];

    // Инициализируем группы для всех тиров
    tiers.forEach((t) => {
      grouped[t.id] = [];
    });

    books.forEach((b) => {
      if (b.tierId && grouped[b.tierId]) {
        grouped[b.tierId].push(b);
      } else {
        unranked.push(b);
      }
    });

    return { grouped, unranked };
  }, [tiers, books]);

  return (
    <div className="curated-editor">
      {/* === Тиры === */}
      <div className="curated-editor-section">
        <div className="curated-editor-section-header">
          <h3>Уровни (тиры)</h3>
          <button
            type="button"
            className="curated-editor-add-btn"
            onClick={handleAddTier}
          >
            <Plus size={14} />
            Добавить уровень
          </button>
        </div>

        {tiers.length === 0 && (
          <p className="curated-editor-empty">
            Нет уровней. Добавьте хотя бы один уровень для книг.
          </p>
        )}

        <div className="curated-editor-tiers-list">
          {tiers.map((tier, idx) => (
            <div key={tier.id} className="curated-editor-tier-row">
              <span className="curated-editor-tier-index">{idx + 1}</span>
              <input
                type="text"
                className="curated-editor-input"
                value={tier.title}
                onChange={(e) =>
                  handleUpdateTier(tier.id, "title", e.target.value)
                }
                placeholder="Название уровня (S, A, B...)"
              />
              <div className="curated-editor-color-picker">
                {TIER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`curated-editor-color-btn ${tier.color === c.value ? "active" : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() =>
                      handleUpdateTier(tier.id, "color", c.value)
                    }
                    title={c.label}
                  />
                ))}
              </div>
              <button
                type="button"
                className="curated-editor-delete-btn"
                onClick={() => handleDeleteTier(tier.id)}
                title="Удалить уровень"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* === Книги === */}
      <div className="curated-editor-section">
        <div className="curated-editor-section-header">
          <h3>Книги</h3>
          <button
            type="button"
            className="curated-editor-add-btn"
            onClick={handleAddBook}
          >
            <Plus size={14} />
            Добавить книгу
          </button>
        </div>

        {/* Книги по тирам */}
        {tiers.map((tier) => {
          const tierBooks = booksByTier.grouped[tier.id] || [];
          if (tierBooks.length === 0) return null;

          return (
            <div key={tier.id} className="curated-editor-tier-group">
              <div
                className="curated-editor-tier-label"
                style={{ borderLeftColor: tier.color }}
              >
                {tier.title}
              </div>
              {tierBooks.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  tiers={tiers}
                  onUpdate={handleUpdateBook}
                  onDelete={handleDeleteBook}
                  onMove={handleMoveBook}
                  onEdit={handleOpenEdit}
                />
              ))}
            </div>
          );
        })}

        {/* Unranked книги */}
        {booksByTier.unranked.length > 0 && (
          <div className="curated-editor-tier-group">
            <div className="curated-editor-tier-label unranked">
              Без уровня
            </div>
            {booksByTier.unranked.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                tiers={tiers}
                onUpdate={handleUpdateBook}
                onDelete={handleDeleteBook}
                onMove={handleMoveBook}
                onEdit={handleOpenEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* === Модалка редактирования книги === */}
      {editingBook && editForm && (
        <div
          className="admin-collections-modal-overlay"
        >
          <div
            className="admin-collections-modal curated-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-collections-modal-header">
              <h2>Редактировать книгу</h2>
              <button
                className="admin-collections-modal-close"
                onClick={handleCloseEdit}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-collections-form">
              <div className="admin-collections-form-row">
                <div className="admin-collections-form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    placeholder="Название книги"
                  />
                </div>
                <div className="admin-collections-form-group">
                  <label>Автор</label>
                  <input
                    type="text"
                    value={editForm.author}
                    onChange={(e) =>
                      setEditForm({ ...editForm, author: e.target.value })
                    }
                    placeholder="Имя автора"
                  />
                </div>
              </div>

              <div className="admin-collections-form-row">
                <div className="admin-collections-form-group">
                  <label>Жанр</label>
                  <input
                    type="text"
                    value={editForm.genre || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, genre: e.target.value })
                    }
                    placeholder="Фэнтези, детектив..."
                  />
                </div>
                <div className="admin-collections-form-group">
                  <label>Теги (через запятую)</label>
                  <input
                    type="text"
                    value={editForm.tags || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tags: e.target.value })
                    }
                    placeholder="магия, приключения, эпос"
                  />
                </div>
              </div>

              <div className="admin-collections-form-group">
                <label>URL обложки</label>
                <input
                  type="text"
                  value={editForm.coverImageUrl}
                  onChange={(e) =>
                    setEditForm({ ...editForm, coverImageUrl: e.target.value })
                  }
                  placeholder="/images/collections/curated/slug/image.jpeg"
                />
                {editForm.coverImageUrl && (
                  <div className="curated-edit-cover-preview">
                    <img
                      src={editForm.coverImageUrl}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="admin-collections-form-group">
                <label>Описание</label>
                <textarea
                  value={editForm.description || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Краткое описание книги"
                  rows={3}
                />
              </div>

              <div className="admin-collections-form-group">
                <label>Средняя оценка (1–10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={editForm.rating ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rating: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="8.5"
                />
              </div>

              <div className="admin-collections-form-actions">
                <button
                  type="button"
                  className="admin-collections-btn-cancel"
                  onClick={handleCloseEdit}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="admin-collections-btn-submit"
                  onClick={handleSaveEdit}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === BookRow ===

interface BookRowProps {
  book: CuratedBook;
  tiers: CuratedTier[];
  onUpdate: (id: string, field: keyof CuratedBook, value: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (bookId: string, newTierId: string | null) => void;
  onEdit: (book: CuratedBook) => void;
}

const BookRow = memo(function BookRow({
  book,
  tiers,
  onUpdate,
  onDelete,
  onMove,
  onEdit,
}: BookRowProps) {
  const isNew = !book.title && !book.author;

  return (
    <div className={`curated-editor-book-row ${isNew ? "new" : ""}`}>
      <div className="curated-editor-book-fields">
        <div className="curated-editor-book-row-main">
          <input
            type="text"
            className="curated-editor-input"
            value={book.title}
            onChange={(e) => onUpdate(book.id, "title", e.target.value)}
            placeholder="Название книги"
          />
          <input
            type="text"
            className="curated-editor-input"
            value={book.author}
            onChange={(e) => onUpdate(book.id, "author", e.target.value)}
            placeholder="Автор"
          />
        </div>
        <div className="curated-editor-book-row-meta">
          {tiers.length > 0 && (
            <select
              className="curated-editor-select"
              value={book.tierId ?? ""}
              onChange={(e) =>
                onMove(book.id, e.target.value || null)
              }
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
