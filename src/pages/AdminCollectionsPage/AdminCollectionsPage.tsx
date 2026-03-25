import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { sileo } from "sileo";
import {
  getAllCollectionsForAdmin,
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollectionPublish,
  type CollectionItem,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/collectionsApi";
import { useAuth } from "@/hooks/useAuthContext";
import { WysiwygEditor } from "./components/WysiwygEditor";
import "./AdminCollectionsPage.css";

interface CollectionFormData {
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  bookCovers: string[];
  tags: string;
  isPublished: boolean;
  order: number;
}

const emptyFormData: CollectionFormData = {
  title: "",
  content: "",
  excerpt: "",
  coverImageUrl: "",
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

  const handleOpenCreate = () => {
    setEditingCollection(null);
    setFormData(emptyFormData);
    setShowModal(true);
  };

  const handleOpenEdit = (collection: CollectionItem) => {
    setEditingCollection(collection);
    setFormData({
      title: collection.title,
      content: collection.content,
      excerpt: collection.excerpt,
      coverImageUrl: collection.coverImageUrl || "",
      bookCovers:
        collection.bookCovers.length >= 3
          ? collection.bookCovers
          : [
              ...collection.bookCovers,
              ...Array(3 - collection.bookCovers.length).fill(""),
            ],
      tags: collection.tags.join(", "),
      isPublished: collection.isPublished,
      order: collection.order,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCollection(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const input: CreateCollectionInput | UpdateCollectionInput = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim(),
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        bookCovers: formData.bookCovers.filter((url) => url.trim() !== ""),
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        isPublished: formData.isPublished,
        order: formData.order,
      };

      if (editingCollection) {
        await updateCollection(editingCollection.id, input);
        sileo.success({
          title: "Коллекция обновлена",
          description: `"${input.title}" сохранена`,
          duration: 3000,
        });
      } else {
        await createCollection(input as CreateCollectionInput);
        sileo.success({
          title: "Коллекция создана",
          description: `"${input.title}" опубликована`,
          duration: 3000,
        });
      }

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
    if (!confirm(`Вы уверены, что хотите удалить коллекцию "${title}"?`)) {
      return;
    }

    try {
      await deleteCollection(id);
      sileo.success({
        title: "Коллекция удалена",
        description: `"${title}" удалена`,
        duration: 3000,
      });
      loadCollections();
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

  return (
    <DashboardLayout
      onMyRatingsClick={() => navigate("/")}
      showTemplatesNav={false}
      showSearch={false}
      activeItem="Коллекции"
    >
      <div className="admin-collections-page">
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
            <h1 className="admin-collections-title">Управление коллекциями</h1>
            <p className="admin-collections-subtitle">
              Литературные подборки: лауреаты, фавориты, историческая проза
            </p>
          </div>
          <button
            className="admin-collections-create-btn"
            onClick={handleOpenCreate}
          >
            <Plus size={20} />
            <span>Создать коллекцию</span>
          </button>
        </div>

        <div className="admin-collections-table-wrapper">
          {loading ? (
            <div className="admin-collections-loading">
              <FileText className="animate-pulse" size={48} />
              <p>Загрузка коллекций...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="admin-collections-empty">
              <FileText size={48} />
              <p>Коллекций пока нет</p>
              <button
                className="admin-collections-create-btn"
                onClick={handleOpenCreate}
              >
                <Plus size={18} />
                <span>Создать первую коллекцию</span>
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
                {collections.map((collection) => (
                  <tr key={collection.id}>
                    <td className="admin-collections-title-cell">
                      <span>{collection.title}</span>
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
                        className="admin-collections-action-btn"
                        onClick={() => handleOpenEdit(collection)}
                        title="Редактировать"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="admin-collections-action-btn delete"
                        onClick={() =>
                          handleDelete(collection.id, collection.title)
                        }
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
            onClick={handleCloseModal}
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

                <div className="admin-collections-form-group">
                  <label htmlFor="content">Содержание *</label>
                  <WysiwygEditor
                    value={formData.content}
                    onChange={(content) =>
                      setFormData({ ...formData, content })
                    }
                  />
                </div>

                <div className="admin-collections-form-row">
                  <div className="admin-collections-form-group">
                    <label htmlFor="coverImageUrl">URL обложки коллекции</label>
                    <input
                      id="coverImageUrl"
                      type="url"
                      value={formData.coverImageUrl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          coverImageUrl: e.target.value,
                        })
                      }
                      placeholder="https://example.com/cover.jpg"
                    />
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
      </div>
    </DashboardLayout>
  );
}
