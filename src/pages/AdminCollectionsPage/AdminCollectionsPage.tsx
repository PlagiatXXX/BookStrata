import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { sileo } from "sileo";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import {
  getAllCollectionsForAdmin,
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollectionPublish,
  uploadCollectionCover,
  type CollectionItem,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/collectionsApi";
import { CATEGORIES } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuthContext";
import { WysiwygEditor } from "./components/WysiwygEditor";
import {
  CuratedCollectionEditor,
  type CuratedTier,
  type CuratedBook,
} from "./components/CuratedCollectionEditor";
import "./AdminCollectionsPage.css";

interface CollectionFormData {
  type: "curated" | "literary";
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  categoryId: string;
  bookCovers: string[];
  tags: string;
  isPublished: boolean;
  order: number;
}

const emptyFormData: CollectionFormData = {
  type: "literary",
  title: "",
  content: "",
  excerpt: "",
  coverImageUrl: "",
  categoryId: "",
  bookCovers: ["", "", ""],
  tags: "",
  isPublished: false,
  order: 0,
};

export function AdminCollectionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<CollectionItem | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(emptyFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояние для curated-редактора
  const [curatedTiers, setCuratedTiers] = useState<CuratedTier[]>([]);
  const [curatedBooks, setCuratedBooks] = useState<CuratedBook[]>([]);

  // Фильтр по типу: "all" | "curated" | "literary"
  const [typeFilter, setTypeFilter] = useState<"all" | "curated" | "literary">("all");

  const filteredCollections = useMemo(() => {
    if (typeFilter === "all") return collections;
    return collections.filter((c) => c.type === typeFilter);
  }, [collections, typeFilter]);

  // Проверка на администратора
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await getAllCollectionsForAdmin();
      setCollections(response.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error("Failed to load collections:", error);
      sileo.error({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить коллекции",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (presetType?: "curated" | "literary") => {
    setEditingCollection(null);
    setFormData({ ...emptyFormData, type: presetType || "literary" });
    setCuratedTiers(
      presetType === "curated" && !editingCollection
        ? [
            { id: "tier_s", title: "S", color: "#ef4444" },
            { id: "tier_a", title: "A", color: "#f97316" },
            { id: "tier_b", title: "B", color: "#eab308" },
            { id: "tier_c", title: "C", color: "#84cc16" },
          ]
        : [],
    );
    setCuratedBooks([]);
    setShowModal(true);
  };

  // Конвертировать сохранённую коллекцию в формат редактора
  const handleOpenEdit = (collection: CollectionItem) => {
    setEditingCollection(collection);
    setFormData({
      type: collection.type,
      title: collection.title,
      content: collection.content || "",
      excerpt: collection.excerpt || "",
      coverImageUrl: collection.coverImageUrl || "",
      categoryId: collection.categoryId || "",
      bookCovers: collection.bookCovers?.length ? collection.bookCovers : ["", "", ""],
      tags: collection.tags.join(", "),
      isPublished: collection.isPublished,
      order: collection.order,
    });

    if (collection.type === "curated" && collection.tiers && collection.tierOrder) {
      // Конвертируем сохранённые тиры
      const tiers: CuratedTier[] = collection.tierOrder
        .map((id) => collection.tiers?.[id])
        .filter(Boolean)
        .map((t) => ({
          id: t!.id,
          title: t!.title,
          color: t!.color,
        }));
      setCuratedTiers(tiers);

      // Конвертируем книги
      const books: CuratedBook[] = [];
      const allBooks = collection.books || {};

      // Книги в тирах
      collection.tierOrder.forEach((tierId) => {
        const tier = collection.tiers?.[tierId];
        if (tier) {
          tier.bookIds.forEach((bookId) => {
            const book = allBooks[bookId];
            if (book) {
              books.push({
                id: bookId,
                title: book.title,
                author: book.author,
                coverImageUrl: book.coverImageUrl,
                description: book.description,
                rating: book.rating,
                genre: book.genre,
                tags: book.tags?.join(", "),
                tierId: tierId,
              });
            }
          });
        }
      });

      // Unranked книги
      (collection.unrankedBookIds || []).forEach((bookId) => {
        const book = allBooks[bookId];
        if (book) {
          books.push({
            id: bookId,
            title: book.title,
            author: book.author,
            coverImageUrl: book.coverImageUrl,
            description: book.description,
            rating: book.rating,
            genre: book.genre,
            tags: book.tags?.join(", "),
            tierId: null,
          });
        }
      });

      setCuratedBooks(books);
    } else {
      setCuratedTiers([]);
      setCuratedBooks([]);
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCollection(null);
    setFormData(emptyFormData);
    setCuratedTiers([]);
    setCuratedBooks([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const baseInput = {
        type: formData.type,
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim(),
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        categoryId: formData.categoryId || undefined,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        isPublished: formData.isPublished,
        order: formData.order,
      };

      if (formData.type === "curated") {
        // Строим tiers Record и tierOrder из CuratedTier[]
        const tiers: Record<string, { id: string; title: string; color: string; bookIds: string[] }> = {};
        const tierOrder: string[] = [];
        const books: Record<string, { id: string; title: string; author: string; coverImageUrl: string; description?: string; rating?: number; genre?: string; tags?: string[] }> = {};
        const unrankedBookIds: string[] = [];

        curatedTiers.forEach((t) => {
          tiers[t.id] = { id: t.id, title: t.title, color: t.color, bookIds: [] };
          tierOrder.push(t.id);
        });

        // Разносим книги по тирам
        curatedBooks.forEach((b) => {
          if (!b.title.trim()) return; // пропускаем пустые

          const bookId = b.id;
          books[bookId] = {
            id: bookId,
            title: b.title.trim(),
            author: b.author.trim(),
            coverImageUrl: b.coverImageUrl.trim(),
            description: b.description?.trim(),
            rating: b.rating,
            genre: b.genre?.trim(),
            tags: b.tags
              ? b.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : undefined,
          };

          if (b.tierId && tiers[b.tierId]) {
            tiers[b.tierId].bookIds.push(bookId);
          } else {
            unrankedBookIds.push(bookId);
          }
        });

        const input = {
          ...baseInput,
          tiers,
          tierOrder,
          books,
          unrankedBookIds,
          content: undefined,
          bookCovers: formData.bookCovers.filter((url) => url.trim() !== ""),
        };

        if (editingCollection) {
          await updateCollection(editingCollection.id, input as UpdateCollectionInput);
        } else {
          await createCollection(input as unknown as CreateCollectionInput);
        }
      } else {
        // literary — как было
        const input = {
          ...baseInput,
          content: formData.content.trim() || undefined,
          bookCovers: formData.bookCovers.filter((url) => url.trim() !== ""),
        };

        if (editingCollection) {
          await updateCollection(editingCollection.id, input as UpdateCollectionInput);
        } else {
          await createCollection(input as unknown as CreateCollectionInput);
        }
      }

      sileo.success({
        title: editingCollection ? "Коллекция обновлена" : "Коллекция создана",
        description: `"${formData.title.trim()}" сохранена`,
        duration: 3000,
      });

      handleCloseModal();
      loadCollections();
    } catch (error) {
      console.error("Failed to save collection:", error);
      sileo.error({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить коллекцию",
        duration: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    try {
      await deleteCollection(id);
      sileo.success({
        title: "Коллекция удалена",
        description: `"${title}" удалена`,
        duration: 3000,
      });
      loadCollections();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete collection:", error);
      sileo.error({
        title: "Ошибка удаления",
        description: "Не удалось удалить коллекцию",
        duration: 3000,
      });
    }
  };

  const handleTogglePublish = async (
    id: number,
    isPublished: boolean,
    title: string,
  ) => {
    try {
      await toggleCollectionPublish(id);
      sileo.success({
        title: isPublished
          ? "Коллекция снята с публикации"
          : "Коллекция опубликована",
        description: `"${title}"`,
        duration: 3000,
      });
      loadCollections();
    } catch (error) {
      console.error("Failed to toggle publish:", error);
      sileo.error({
        title: "Ошибка",
        description: "Не удалось изменить статус публикации",
        duration: 3000,
      });
    }
  };

  const handleBookCoverChange = (index: number, value: string) => {
    const newBookCovers = [...formData.bookCovers];
    newBookCovers[index] = value;
    setFormData({ ...formData, bookCovers: newBookCovers });
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      sileo.error({ title: "Слишком большой файл", description: "Максимум 5 MB" });
      return;
    }

    setCoverUploading(true);
    try {
      const result = await uploadCollectionCover(file);
      setFormData({ ...formData, coverImageUrl: result.coverImageUrl });
      sileo.success({ title: "Обложка загружена" });
    } catch {
      sileo.error({ title: "Ошибка загрузки" });
    } finally {
      setCoverUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout
      showTemplatesNav={false}
      showSearch={false}
      activeItem="Коллекции"
    >
      <div className="admin-collections-page">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Назад в админку</span>
        </button>
        <div className="admin-collections-header">
          <div>
            <div className="admin-nav-tabs">
              <Link
                to="/admin/news"
                className={`admin-nav-tab ${location.pathname === "/admin/news" ? "active" : ""}`}
              >
                Новости
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/collections"
                  className={`admin-nav-tab ${location.pathname === "/admin/collections" ? "active" : ""}`}
                >
                  Коллекции
                </Link>
              )}
            </div>

            {/* Sub-tabs: Все / Статьи / Тир-листы */}
            <div className="admin-collections-subtabs">
              <button
                className={`admin-collections-subtab ${typeFilter === "all" ? "active" : ""}`}
                onClick={() => setTypeFilter("all")}
              >
                Все
              </button>
              <button
                className={`admin-collections-subtab ${typeFilter === "literary" ? "active" : ""}`}
                onClick={() => setTypeFilter("literary")}
              >
                Статьи
              </button>
              <button
                className={`admin-collections-subtab ${typeFilter === "curated" ? "active" : ""}`}
                onClick={() => setTypeFilter("curated")}
              >
                Тир-листы
              </button>
            </div>

            <h1 className="admin-collections-title">
              {typeFilter === "all" && "Все коллекции"}
              {typeFilter === "literary" && "Литературные подборки"}
              {typeFilter === "curated" && "Тир-листы BookStrata"}
            </h1>
            <p className="admin-collections-subtitle">
              {typeFilter === "all" && "Литературные подборки и тир-листы"}
              {typeFilter === "literary" && "Статьи: лауреаты, фавориты, историческая проза"}
              {typeFilter === "curated" && "Рейтинговые подборки с тирами"}
            </p>
          </div>
          <button
            className="admin-collections-create-btn"
            onClick={() => {
              handleOpenCreate(typeFilter === "literary" ? "literary" : "curated");
            }}
          >
            <Plus size={20} />
            <span>
              {typeFilter === "literary" && "Создать статью"}
              {typeFilter === "curated" && "Создать тир-лист"}
              {typeFilter === "all" && "Создать"}
            </span>
          </button>
        </div>

        <div className="admin-collections-table-wrapper">
          {loading ? (
            <div className="admin-collections-loading">
              <FileText className="animate-pulse" size={48} />
              <p>Загрузка...</p>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="admin-collections-empty">
              <FileText size={48} />
              <p>
                {typeFilter === "all" && "Коллекций пока нет"}
                {typeFilter === "literary" && "Литературных подборок пока нет"}
                {typeFilter === "curated" && "Тир-листов пока нет"}
              </p>
              <button
                className="admin-collections-create-btn"
                onClick={() => handleOpenCreate(typeFilter === "literary" ? "literary" : "curated")}
              >
                <Plus size={18} />
                <span>
                  {typeFilter === "literary" ? "Создать статью" : "Создать тир-лист"}
                </span>
              </button>
            </div>
          ) : (
            <table className="admin-collections-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Теги</th>
                  <th>Порядок</th>
                  <th>Статус</th>
                  <th>Дата обновления</th>
                  <th className="admin-collections-actions">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((collection) => (
                  <tr key={collection.id}>
                    <td className="admin-collections-title-cell">
                      <div className="flex items-center gap-2">
                        <span>{collection.title}</span>
                        <span className={`admin-collections-type-badge ${collection.type}`}>
                          {collection.type === "curated" ? "Тир-лист" : "Статья"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-collections-tags">
                        {collection.tags.map((tag: string, index: number) => (
                          <span key={index} className="admin-collections-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{collection.order}</td>
                    <td>
                      <button
                        className={`admin-collections-status-btn ${collection.isPublished ? "published" : "draft"}`}
                        onClick={() =>
                          handleTogglePublish(
                            collection.id,
                            collection.isPublished,
                            collection.title,
                          )
                        }
                        title={
                          collection.isPublished ? "Опубликовано" : "Черновик"
                        }
                      >
                        {collection.isPublished ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>
                    </td>
                    <td>
                      {new Date(collection.updatedAt).toLocaleDateString(
                        "ru-RU",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </td>
                    <td className="admin-collections-actions">
                      <button
                        onClick={() => handleOpenEdit(collection)}
                        className="cursor-pointer text-gray-400 hover:text-cyan-400 transition-colors"
                        title="Редактировать"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: collection.id, title: collection.title })}
                        className="cursor-pointer text-gray-400 hover:text-red-400 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div
            className="admin-collections-modal-overlay"
          >
            <div
              className="admin-collections-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-collections-modal-header">
                <h2>
                  {editingCollection
                    ? "Редактировать коллекцию"
                    : "Создать коллекцию"}
                </h2>
                <button
                  className="admin-collections-modal-close"
                  onClick={handleCloseModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-collections-form">
                <div className="admin-collections-form-group">
                  <label htmlFor="title">Заголовок *</label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Введите название коллекции"
                    required
                    maxLength={255}
                  />
                </div>

                <div className="admin-collections-form-group">
                  <label htmlFor="excerpt">Краткое описание *</label>
                  <textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData({ ...formData, excerpt: e.target.value })
                    }
                    placeholder="Краткое описание (до 300 символов)"
                    required
                    maxLength={300}
                    rows={2}
                  />
                </div>

                {/* Тип коллекции */}
                <div className="admin-collections-form-group">
                  <label>Тип коллекции</label>
                  <div className="curated-editor-type-selector">
                    <button
                      type="button"
                      className={`curated-editor-type-btn ${formData.type === "curated" ? "active" : ""}`}
                      onClick={() => {
                        setFormData({ ...formData, type: "curated", content: "" });
                        if (!editingCollection) {
                          setCuratedTiers([
                            { id: "tier_s", title: "S", color: "#ef4444" },
                            { id: "tier_a", title: "A", color: "#f97316" },
                            { id: "tier_b", title: "B", color: "#eab308" },
                            { id: "tier_c", title: "C", color: "#84cc16" },
                          ]);
                        }
                      }}
                    >
                      Тир-лист (подборка с рейтингом)
                    </button>
                    <button
                      type="button"
                      className={`curated-editor-type-btn ${formData.type === "literary" ? "active" : ""}`}
                      onClick={() => {
                        setFormData({ ...formData, type: "literary" });
                        setCuratedTiers([]);
                        setCuratedBooks([]);
                      }}
                    >
                      Статья (текстовая подборка)
                    </button>
                  </div>
                </div>

                {/* Категория (жанр) */}
                <div className="admin-collections-form-group">
                  <label htmlFor="categoryId">Категория (жанр)</label>
                  <select
                    id="categoryId"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                  >
                    <option value="">Без категории</option>
                    {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Контент: зависит от типа */}
                {formData.type === "literary" ? (
                  <div className="admin-collections-form-group">
                    <label htmlFor="content">Содержание *</label>
                    <WysiwygEditor
                      value={formData.content}
                      onChange={(content) =>
                        setFormData({ ...formData, content })
                      }
                    />
                  </div>
                ) : (
                  <div className="admin-collections-form-group">
                    <label>Книги и уровни</label>
                    <CuratedCollectionEditor
                      tiers={curatedTiers}
                      books={curatedBooks}
                      onTiersChange={setCuratedTiers}
                      onBooksChange={setCuratedBooks}
                    />
                  </div>
                )}

                <div className="admin-collections-form-row">
                  <div className="admin-collections-form-group">
                    <label htmlFor="coverImageUrl">URL обложки коллекции</label>
                    <div className="flex gap-2 items-start">
                      <input
                        id="coverImageUrl"
                        type="text"
                        value={formData.coverImageUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            coverImageUrl: e.target.value,
                          })
                        }
                        placeholder="/images/collections/nazvanie.webp"
                        className="flex-1"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleCoverFileSelect}
                      />
                      <button
                        type="button"
                        className="admin-collections-btn-upload"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={coverUploading}
                      >
                        {coverUploading ? "..." : "Загрузить"}
                      </button>
                    </div>
                  </div>

                  <div className="admin-collections-form-group">
                    <label htmlFor="order">Порядок отображения</label>
                    <input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          order: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                    />
                  </div>
                </div>

                {formData.type === "literary" && (
                  <div className="admin-collections-form-group">
                    <label>Обложки книг (до 3)</label>
                    <div className="admin-collections-book-covers">
                      {formData.bookCovers.map((cover, index) => (
                        <input
                          key={index}
                          type="url"
                          placeholder={`Обложка ${index + 1}`}
                          value={cover}
                          onChange={(e) =>
                            handleBookCoverChange(index, e.target.value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="admin-collections-form-group">
                  <label htmlFor="tags">Теги</label>
                  <input
                    id="tags"
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="Нобелевская премия, Классика, Лауреаты"
                  />
                  <span className="admin-collections-form-hint">
                    Через запятую
                  </span>
                </div>

                <div className="admin-collections-form-group">
                  <label className="admin-collections-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isPublished: e.target.checked,
                        })
                      }
                    />
                    <span>Опубликовать сразу</span>
                  </label>
                </div>

                <div className="admin-collections-form-actions">
                  <button
                    type="button"
                    className="admin-collections-btn-cancel"
                    onClick={handleCloseModal}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="admin-collections-btn-submit"
                    disabled={formLoading}
                  >
                    {formLoading
                      ? "Сохранение..."
                      : editingCollection
                        ? "Сохранить"
                        : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      <EditorConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            handleDelete(deleteConfirm.id, deleteConfirm.title);
          }
        }}
        title="Удалить коллекцию?"
        titleId="delete-collection-title"
        confirmLabel="Удалить"
        description={
          deleteConfirm ? (
            <p>Вы уверены, что хотите удалить коллекцию <span className="font-bold text-[#f6f1e8]">"{deleteConfirm.title}"</span>?</p>
          ) : null
        }
      />
      </div>
    </DashboardLayout>
  );
}
