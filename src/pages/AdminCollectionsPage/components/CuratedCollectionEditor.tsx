import { useState, useCallback, useMemo, memo, useRef } from "react";
import { Plus, Trash2, Edit3, X, Upload, ExternalLink, GripVertical } from "lucide-react";
import { DndContext, useDraggable, useDroppable, pointerWithin, type DragEndEvent } from "@dnd-kit/core";

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
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Парсинг URL
  const [showParseUrl, setShowParseUrl] = useState(false);
  const [parseUrl, setParseUrl] = useState("");
  const [parseUrlLoading, setParseUrlLoading] = useState(false);
  const [parseUrlError, setParseUrlError] = useState<string | null>(null);
  const [parsedBooks, setParsedBooks] = useState<{ title: string; author: string; coverImageUrl: string }[] | null>(null);
  const [coversLoading, setCoversLoading] = useState(false);
  const [coversFeedback, setCoversFeedback] = useState<string | null>(null);

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
      tierId: null, // всегда в unranked
    };
    onBooksChange([...books, newBook]);
  }, [books, onBooksChange]);

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

  // Парсинг URL
  const handleOpenParseUrl = useCallback(() => {
    setParseUrl("");
    setParseUrlError(null);
    setParsedBooks(null);
    setShowParseUrl(true);
  }, []);

  const handleCloseParseUrl = useCallback(() => {
    setShowParseUrl(false);
    setParseUrlError(null);
    setParsedBooks(null);
    setParseUrl("");
    setCoversFeedback(null);
  }, []);

  const handleParseUrl = useCallback(async () => {
    const trimmed = parseUrl.trim();
    if (!trimmed) {
      setParseUrlError("Введите URL статьи с подборкой книг");
      return;
    }
      setParseUrlLoading(true);
      setParseUrlError(null);
      setParsedBooks(null);
      setCoversFeedback(null);

    try {
      const { parseBooksFromUrl } = await import("@/lib/collectionsApi");
      const data = await parseBooksFromUrl(trimmed);
      const books = Array.isArray(data) ? data : [];
      if (books.length === 0) {
        setParseUrlError("Не удалось найти книги на странице. Возможно, сайт защищён от парсинга.");
        return;
      }
      setParsedBooks(books);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка при загрузке страницы";
      setParseUrlError(msg);
    } finally {
      setParseUrlLoading(false);
    }
  }, [parseUrl]);

  const handleFetchCovers = useCallback(async () => {
    if (!parsedBooks || parsedBooks.length === 0) return;
    setCoversLoading(true);
    setCoversFeedback(null);
    try {
      const { fetchCoversForBooks } = await import("@/lib/collectionsApi");
      const withCovers = await fetchCoversForBooks(
        parsedBooks.map((b) => ({ title: b.title, author: b.author })),
      );
      setParsedBooks(withCovers);
      const found = withCovers.filter(b => b.coverImageUrl).length;
      if (found === 0) {
        setCoversFeedback("Не найдено ни одной обложки. Русские книги лучше искать через Google Books, но API может not найти редкие издания.");
      } else {
        setCoversFeedback(`Найдено обложек: ${found} из ${withCovers.length}`);
      }
    } catch {
      setCoversFeedback("Ошибка при поиске обложек");
    } finally {
      setCoversLoading(false);
    }
  }, [parsedBooks]);

  const handleImportParsedBooks = useCallback(() => {
    if (!parsedBooks) return;
    const newBooks: CuratedBook[] = parsedBooks.map((pb) => ({
      id: genId(),
      title: pb.title,
      author: pb.author,
      coverImageUrl: pb.coverImageUrl || "",
      tierId: null, // всегда в unranked
    }));
    onBooksChange([...books, ...newBooks]);
    setShowParseUrl(false);
    setParsedBooks(null);
    setParseUrl("");
  }, [parsedBooks, books, onBooksChange]);

  // JSON import
  const handleOpenJsonImport = useCallback(() => {
    setJsonImportText("");
    setJsonImportError(null);
    setShowJsonImport(true);
    setTimeout(() => jsonTextareaRef.current?.focus(), 100);
  }, []);

  const handleCloseJsonImport = useCallback(() => {
    setShowJsonImport(false);
    setJsonImportError(null);
    setJsonImportText("");
  }, []);

  const handleJsonImport = useCallback(() => {
    setJsonImportError(null);
    const trimmed = jsonImportText.trim();
    if (!trimmed) {
      setJsonImportError("Вставьте JSON с книгами");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setJsonImportError("Невалидный JSON. Проверьте синтаксис.");
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setJsonImportError("JSON должен быть массивом объектов с полем \"title\"");
      return;
    }

    const newBooks: CuratedBook[] = [];
    const errors: string[] = [];

    parsed.forEach((item: unknown, index: number) => {
      if (!item || typeof item !== "object") {
        errors.push(`Строка ${index + 1}: не объект`);
        return;
      }

      const obj = item as Record<string, unknown>;
      const title = String(obj.title || "").trim();

      if (!title) {
        errors.push(`Строка ${index + 1}: нет поля "title"`);
        return;
      }

      newBooks.push({
        id: genId(),
        title,
        author: String(obj.author || "").trim(),
        coverImageUrl: String(obj.coverImageUrl || obj.cover_url || "").trim(),
        description: obj.description ? String(obj.description).trim() : undefined,
        genre: obj.genre ? String(obj.genre).trim() : undefined,
        rating: typeof obj.rating === "number" ? obj.rating : undefined,
        tags: obj.tags ? String(obj.tags) : undefined,
        tierId: null, // всегда в unranked
      });
    });

    if (newBooks.length === 0) {
      setJsonImportError("Не удалось импортировать ни одной книги. Убедитесь, что каждая запись содержит поле \"title\".");
      return;
    }

    onBooksChange([...books, ...newBooks]);
    setShowJsonImport(false);
    setJsonImportText("");

    // Если были ошибки — покажем их, но книги всё равно добавим
    if (errors.length > 0) {
      const msg = `Добавлено ${newBooks.length} книг. Ошибки в ${errors.length} строках: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? `... (ещё ${errors.length - 3})` : ""}`;
      setJsonImportError(msg);
      // Сбрасываем ошибку через 5 секунд, чтобы админ её увидел
      setTimeout(() => setJsonImportError(null), 5000);
    }
  }, [jsonImportText, books, onBooksChange]);

  // Обработчик окончания перетаскивания книги
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    const bookId = active.data.current?.bookId as string | undefined;
    const targetTierId = over.id as string;

    if (bookId && targetTierId) {
      // Перемещаем книгу в другой тир
      // Если дропнули на "Без уровня" — ставим tierId: null
      const newTierId = targetTierId === "__unranked__" ? null : targetTierId;
      onBooksChange(
        books.map((b) => (b.id === bookId ? { ...b, tierId: newTierId } : b)),
      );
    }
  }, [books, onBooksChange]);

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
          <div className="flex gap-2">
            <button
              type="button"
              className="curated-editor-add-btn curated-editor-add-btn--secondary"
              onClick={handleOpenParseUrl}
            >
              <ExternalLink size={14} />
              Импорт по ссылке
            </button>
            <button
              type="button"
              className="curated-editor-add-btn curated-editor-add-btn--secondary"
              onClick={handleOpenJsonImport}
            >
              <Upload size={14} />
              Импорт JSON
            </button>
            <button
              type="button"
              className="curated-editor-add-btn"
              onClick={handleAddBook}
            >
              <Plus size={14} />
              Добавить книгу
            </button>
          </div>
        </div>

        {/* Книги по тирам — с drag-and-drop */}
        <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          {tiers.map((tier) => {
            const tierBooks = booksByTier.grouped[tier.id] || [];
            if (tierBooks.length === 0) return null;

            return (
              <DroppableTierGroup
                key={tier.id}
                tierId={tier.id}
                label={tier.title}
                color={tier.color}
              >
                {tierBooks.map((book) => (
                  <BookRow
                    key={book.id}
                    book={book}
                    tiers={tiers}
                    onUpdate={handleUpdateBook}
                    onDelete={handleDeleteBook}
                    onMove={handleMoveBook}
                    onEdit={handleOpenEdit}
                    draggable
                  />
                ))}
              </DroppableTierGroup>
            );
          })}

          {/* Unranked книги */}
          {booksByTier.unranked.length > 0 && (
            <DroppableTierGroup
              tierId="__unranked__"
              label="Без уровня"
              color="transparent"
              unranked
            >
              {booksByTier.unranked.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  tiers={tiers}
                  onUpdate={handleUpdateBook}
                  onDelete={handleDeleteBook}
                  onMove={handleMoveBook}
                  onEdit={handleOpenEdit}
                  draggable
                />
              ))}
            </DroppableTierGroup>
          )}
        </DndContext>
      </div>

      {/* === Модалка JSON импорта === */}
      {showJsonImport && (
        <div className="admin-collections-modal-overlay" onClick={handleCloseJsonImport}>
          <div
            className="admin-collections-modal curated-edit-modal"
            style={{ maxWidth: "650px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-collections-modal-header">
              <h2>Импорт книг из JSON</h2>
              <button
                className="admin-collections-modal-close"
                onClick={handleCloseJsonImport}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-collections-form">
              <div className="admin-collections-form-group">
                <label>Вставьте JSON-массив книг</label>
                <textarea
                  ref={jsonTextareaRef}
                  value={jsonImportText}
                  onChange={(e) => {
                    setJsonImportText(e.target.value);
                    setJsonImportError(null);
                  }}
                  placeholder={`[\n  { "title": "Война и мир", "author": "Лев Толстой", "genre": "классика" },\n  { "title": "Преступление и наказание", "author": "Ф. Достоевский", "genre": "классика" }\n]`}
                  rows={12}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem", lineHeight: "1.5" }}
                />
                {jsonImportError && (
                  <p className="admin-collections-form-error">{jsonImportError}</p>
                )}
                <span className="admin-collections-form-hint">
                  Формат: массив объектов с полем <strong>title</strong> (обязательно).
                  Опционально: author, genre, description, coverImageUrl, rating, tags.
                </span>
              </div>

              <div className="admin-collections-form-actions">
                <button
                  type="button"
                  className="admin-collections-btn-cancel"
                  onClick={handleCloseJsonImport}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="admin-collections-btn-submit"
                  onClick={handleJsonImport}
                >
                  Импортировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Модалка импорта по ссылке === */}
      {showParseUrl && (
        <div className="admin-collections-modal-overlay" onClick={handleCloseParseUrl}>
          <div
            className="admin-collections-modal curated-edit-modal"
            style={{ maxWidth: "650px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-collections-modal-header">
              <h2>Импорт книг по ссылке</h2>
              <button
                className="admin-collections-modal-close"
                onClick={handleCloseParseUrl}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-collections-form">
              <div className="admin-collections-form-group">
                <label>Ссылка на статью с подборкой книг</label>
                <input
                  type="url"
                  value={parseUrl}
                  onChange={(e) => {
                    setParseUrl(e.target.value);
                    setParseUrlError(null);
                    setParsedBooks(null);
                  }}
                  placeholder="https://www.livelib.ru/selection/..."
                  autoFocus
                />
                <span className="admin-collections-form-hint">
                  Поддерживаются Livelib, Readrate, Fantlab, LitRes, Wikipedia и другие сайты.
                  Парсятся заголовки и списки.
                </span>
              </div>

              {parseUrlLoading && (
                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Загрузка и парсинг страницы...</p>
              )}

              {parseUrlError && (
                <p className="admin-collections-form-error">{parseUrlError}</p>
              )}

              {parsedBooks && !parseUrlLoading && (
                <div className="admin-collections-form-group">
                  <label>Найдено книг: {parsedBooks.length}</label>
                  <div
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px",
                    }}
                  >
                    {parsedBooks.map((book, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "4px 0",
                          borderBottom: i < parsedBooks.length - 1 ? "1px solid #f3f4f6" : "none",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#9ca3af", minWidth: "20px" }}>{i + 1}.</span>
                        {book.coverImageUrl && (
                          <img
                            src={book.coverImageUrl}
                            alt=""
                            style={{ width: 28, height: 42, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        <strong>{book.title}</strong>
                        {book.author && (
                          <span style={{ color: "#6b7280" }}>— {book.author}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="admin-collections-form-actions">
                <button
                  type="button"
                  className="admin-collections-btn-cancel"
                  onClick={handleCloseParseUrl}
                >
                  Отмена
                </button>
                {parsedBooks && !parseUrlLoading ? (
                  <>
                    <button
                      type="button"
                      className="admin-collections-btn-cancel"
                      onClick={handleFetchCovers}
                      disabled={coversLoading}
                    >
                      {coversLoading ? "Поиск..." : "Найти обложки"}
                    </button>
                    {coversFeedback && (
                      <div style={{
                        fontSize: "0.8rem",
                        color: coversFeedback.includes("Найдено обложек") ? "#16a34a" : "#dc2626",
                        padding: "4px 0",
                      }}>
                        {coversFeedback}
                      </div>
                    )}
                    <button
                      type="button"
                      className="admin-collections-btn-submit"
                      onClick={handleImportParsedBooks}
                    >
                      Импортировать {parsedBooks.length} книг
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="admin-collections-btn-submit"
                    onClick={handleParseUrl}
                    disabled={parseUrlLoading}
                  >
                    {parseUrlLoading ? "Загрузка..." : "Найти книги"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

// === DroppableTierGroup ===

interface DroppableTierGroupProps {
  tierId: string;
  label: string;
  color: string;
  unranked?: boolean;
  children: React.ReactNode;
}

const DroppableTierGroup = memo(function DroppableTierGroup({
  tierId,
  label,
  color,
  unranked,
  children,
}: DroppableTierGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tierId });

  return (
    <div
      ref={setNodeRef}
      className={`curated-editor-tier-group ${isOver ? "curated-editor-tier-group--drag-over" : ""}`}
      style={isOver ? { borderColor: color || "var(--accent-main)" } : undefined}
    >
      <div
        className={`curated-editor-tier-label ${unranked ? "unranked" : ""}`}
        style={unranked ? undefined : { borderLeftColor: color }}
      >
        {label}
      </div>
      {children}
    </div>
  );
});

DroppableTierGroup.displayName = "DroppableTierGroup";

// === BookRow ===

interface BookRowProps {
  book: CuratedBook;
  tiers: CuratedTier[];
  onUpdate: (id: string, field: keyof CuratedBook, value: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (bookId: string, newTierId: string | null) => void;
  onEdit: (book: CuratedBook) => void;
  draggable?: boolean;
}

const BookRow = memo(function BookRow({
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

  // dnd-kit draggable — всегда вызываем хук (правила hooks)
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
            className={`curated-editor-input ${titleEmpty ? "curated-editor-input--error" : ""}`}
            value={book.title}
            onChange={(e) => onUpdate(book.id, "title", e.target.value)}
            placeholder="Название книги *"
            required
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
