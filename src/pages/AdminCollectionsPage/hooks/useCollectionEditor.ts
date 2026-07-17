import { useState, useCallback, useMemo, useRef } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import type { CuratedBook, CuratedTier } from "../components/types";
import { genId, TIER_COLORS } from "../components/types";

export interface UseCollectionEditorReturn {
  // Состояния
  editingBook: CuratedBook | null;
  editForm: CuratedBook | null;
  showJsonImport: boolean;
  jsonImportText: string;
  jsonImportError: string | null;
  showParseUrl: boolean;
  parseUrl: string;
  parseUrlLoading: boolean;
  parseUrlError: string | null;
  parsedBooks: { title: string; author: string; coverImageUrl: string }[] | null;
  coversLoading: boolean;
  coversFeedback: string | null;
  jsonTextareaRef: React.RefObject<HTMLTextAreaElement | null>;

  // Тиры
  handleAddTier: () => void;
  handleUpdateTier: (id: string, field: keyof CuratedTier, value: string) => void;
  handleDeleteTier: (id: string) => void;

  // Книги
  handleAddBook: () => void;
  handleUpdateBook: (id: string, field: keyof CuratedBook, value: string | null) => void;
  handleDeleteBook: (id: string) => void;
  handleMoveBook: (bookId: string, newTierId: string | null) => void;

  // Редактирование
  handleOpenEdit: (book: CuratedBook) => void;
  handleSaveEdit: () => void;
  handleCloseEdit: () => void;
  setEditForm: React.Dispatch<React.SetStateAction<CuratedBook | null>>;

  // JSON импорт
  handleOpenJsonImport: () => void;
  handleCloseJsonImport: () => void;
  handleJsonImport: () => void;
  setJsonImportText: React.Dispatch<React.SetStateAction<string>>;
  setJsonImportError: React.Dispatch<React.SetStateAction<string | null>>;

  // Парсинг URL
  handleOpenParseUrl: () => void;
  handleCloseParseUrl: () => void;
  handleParseUrl: () => Promise<void>;
  handleFetchCovers: () => Promise<void>;
  handleImportParsedBooks: () => void;
  setParseUrl: React.Dispatch<React.SetStateAction<string>>;
  setParseUrlError: React.Dispatch<React.SetStateAction<string | null>>;
  setParsedBooks: React.Dispatch<React.SetStateAction<{ title: string; author: string; coverImageUrl: string }[] | null>>;

  // DnD
  handleDragEnd: (event: DragEndEvent) => void;

  // Вычисляемое
  booksByTier: { grouped: Record<string, CuratedBook[]>; unranked: CuratedBook[] };
}

export function useCollectionEditor(
  tiers: CuratedTier[],
  books: CuratedBook[],
  onTiersChange: (tiers: CuratedTier[]) => void,
  onBooksChange: (books: CuratedBook[]) => void,
): UseCollectionEditorReturn {
  const [editingBook, setEditingBook] = useState<CuratedBook | null>(null);
  const [editForm, setEditForm] = useState<CuratedBook | null>(null);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [showParseUrl, setShowParseUrl] = useState(false);
  const [parseUrl, setParseUrl] = useState("");
  const [parseUrlLoading, setParseUrlLoading] = useState(false);
  const [parseUrlError, setParseUrlError] = useState<string | null>(null);
  const [parsedBooks, setParsedBooks] = useState<{ title: string; author: string; coverImageUrl: string }[] | null>(null);
  const [coversLoading, setCoversLoading] = useState(false);
  const [coversFeedback, setCoversFeedback] = useState<string | null>(null);

  // --- Тиры ---

  const handleAddTier = useCallback(() => {
    const newTier: CuratedTier = {
      id: genId(),
      title: `Уровень ${tiers.length + 1}`,
      color: TIER_COLORS[tiers.length % TIER_COLORS.length].value,
    };
    onTiersChange([...tiers, newTier]);
  }, [tiers, onTiersChange]);

  const handleUpdateTier = useCallback(
    (id: string, field: keyof CuratedTier, value: string) => {
      onTiersChange(
        tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
      );
    },
    [tiers, onTiersChange],
  );

  const handleDeleteTier = useCallback(
    (id: string) => {
      onBooksChange(
        books.map((b) => (b.tierId === id ? { ...b, tierId: null } : b)),
      );
      onTiersChange(tiers.filter((t) => t.id !== id));
    },
    [tiers, books, onTiersChange, onBooksChange],
  );

  // --- Книги ---

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
      tierId: null,
    };
    onBooksChange([...books, newBook]);
  }, [books, onBooksChange]);

  const handleUpdateBook = useCallback(
    (id: string, field: keyof CuratedBook, value: string | null) => {
      onBooksChange(
        books.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
      );
    },
    [books, onBooksChange],
  );

  const handleDeleteBook = useCallback(
    (id: string) => {
      onBooksChange(books.filter((b) => b.id !== id));
    },
    [books, onBooksChange],
  );

  const handleMoveBook = useCallback(
    (bookId: string, newTierId: string | null) => {
      onBooksChange(
        books.map((b) => (b.id === bookId ? { ...b, tierId: newTierId } : b)),
      );
    },
    [books, onBooksChange],
  );

  // --- Редактирование ---

  const handleOpenEdit = useCallback((book: CuratedBook) => {
    setEditingBook(book);
    setEditForm({ ...book });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingBook || !editForm) return;
    onBooksChange(
      books.map((b) => (b.id === editingBook.id ? { ...editForm } : b)),
    );
    setEditingBook(null);
    setEditForm(null);
  }, [editingBook, editForm, books, onBooksChange]);

  const handleCloseEdit = useCallback(() => {
    setEditingBook(null);
    setEditForm(null);
  }, []);

  // --- Парсинг URL ---

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
      const result = Array.isArray(data) ? data : [];
      if (result.length === 0) {
        setParseUrlError("Не удалось найти книги на странице. Возможно, сайт защищён от парсинга.");
        return;
      }
      setParsedBooks(result);
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
        setCoversFeedback("Не найдено ни одной обложки. Русские книги лучше искать через Google Books, но API может не найти редкие издания.");
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
      tierId: null,
    }));
    onBooksChange([...books, ...newBooks]);
    setShowParseUrl(false);
    setParsedBooks(null);
    setParseUrl("");
  }, [parsedBooks, books, onBooksChange]);

  // --- JSON импорт ---

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
        tierId: null,
      });
    });

    if (newBooks.length === 0) {
      setJsonImportError("Не удалось импортировать ни одной книги. Убедитесь, что каждая запись содержит поле \"title\".");
      return;
    }

    onBooksChange([...books, ...newBooks]);
    setShowJsonImport(false);
    setJsonImportText("");

    if (errors.length > 0) {
      const msg = `Добавлено ${newBooks.length} книг. Ошибки в ${errors.length} строках: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? `... (ещё ${errors.length - 3})` : ""}`;
      setJsonImportError(msg);
      setTimeout(() => setJsonImportError(null), 5000);
    }
  }, [jsonImportText, books, onBooksChange]);

  // --- DnD ---

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    const bookId = active.data.current?.bookId as string | undefined;
    const targetTierId = over.id as string;

    if (bookId && targetTierId) {
      const newTierId = targetTierId === "__unranked__" ? null : targetTierId;
      onBooksChange(
        books.map((b) => (b.id === bookId ? { ...b, tierId: newTierId } : b)),
      );
    }
  }, [books, onBooksChange]);

  // --- Вычисляемое ---

  const booksByTier = useMemo(() => {
    const grouped: Record<string, CuratedBook[]> = {};
    const unranked: CuratedBook[] = [];
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

  return {
    editingBook,
    editForm,
    showJsonImport,
    jsonImportText,
    jsonImportError,
    showParseUrl,
    parseUrl,
    parseUrlLoading,
    parseUrlError,
    parsedBooks,
    coversLoading,
    coversFeedback,
    jsonTextareaRef,

    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,

    handleAddBook,
    handleUpdateBook,
    handleDeleteBook,
    handleMoveBook,

    handleOpenEdit,
    handleSaveEdit,
    handleCloseEdit,
    setEditForm,

    handleOpenJsonImport,
    handleCloseJsonImport,
    handleJsonImport,
    setJsonImportText,
    setJsonImportError,

    handleOpenParseUrl,
    handleCloseParseUrl,
    handleParseUrl,
    handleFetchCovers,
    handleImportParsedBooks,
    setParseUrl,
    setParseUrlError,
    setParsedBooks,

    handleDragEnd,

    booksByTier,
  };
}
