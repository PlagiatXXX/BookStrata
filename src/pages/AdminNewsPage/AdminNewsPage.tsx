import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { sileo } from "sileo";
import {
  getNews,
  createNews,
  updateNews,
  deleteNews,
  togglePublish,
  type NewsArticle,
  type CreateNewsInput,
  type UpdateNewsInput,
  getNewsById,
} from "@/lib/newsApi";
import { useAuth } from "@/hooks/useAuthContext";
import { WysiwygEditor } from "@/pages/AdminCollectionsPage/components/WysiwygEditor";
import "./AdminNewsPage.css";

interface NewsFormData {
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  tags: string;
  isPublished: boolean;
}

const emptyFormData: NewsFormData = {
  title: "",
  content: "",
  excerpt: "",
  imageUrl: "",
  tags: "",
  isPublished: false,
};

export function AdminNewsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState<NewsFormData>(emptyFormData);
  const [formLoading, setFormLoading] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Проверка на администратора
  const isAdmin = user?.role === "admin";

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNews(currentPage, ITEMS_PER_PAGE, false);
      setNews(response.data);
      setTotal(response.meta.total);
    } catch (error) {
      console.error("Failed to load news:", error);
      sileo.error({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить новости",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleOpenCreate = () => {
    setEditingNews(null);
    setFormData(emptyFormData);
    setShowModal(true);
  };

  const handleOpenEdit = async (article: NewsArticle) => {
    let fullArticle = article;

    // Если контент не загружен (оптимизация Bolt), подгружаем полную версию
    if (article.content === undefined) {
      try {
        const data = await getNewsById(article.id);
        if (data) {
          fullArticle = data;
        }
      } catch (error) {
        console.error("Failed to load full news content:", error);
        sileo.error({
          title: "Ошибка",
          description: "Не удалось загрузить полный контент новости",
          duration: 3000,
        });
        return;
      }
    }

    setEditingNews(fullArticle);
    setFormData({
      title: fullArticle.title,
      content: fullArticle.content || "",
      excerpt: fullArticle.excerpt,
      imageUrl: fullArticle.imageUrl || "",
      tags: fullArticle.tags.join(", "),
      isPublished: fullArticle.isPublished,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNews(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const input: CreateNewsInput | UpdateNewsInput = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim(),
        imageUrl: formData.imageUrl.trim() || undefined,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        isPublished: formData.isPublished,
      };

      if (editingNews) {
        await updateNews(editingNews.id, input);
        sileo.success({
          title: "Новость обновлена",
          description: `"${input.title}" сохранена`,
          duration: 3000,
        });
      } else {
        await createNews(input as CreateNewsInput);
        sileo.success({
          title: "Новость создана",
          description: `"${input.title}" опубликована`,
          duration: 3000,
        });
      }

      handleCloseModal();
      loadNews();
    } catch (error) {
      console.error("Failed to save news:", error);
      sileo.error({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить новость",
        duration: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить новость "${title}"?`)) {
      return;
    }

    try {
      await deleteNews(id);
      sileo.success({
        title: "Новость удалена",
        description: `"${title}" удалена`,
        duration: 3000,
      });
      loadNews();
    } catch (error) {
      console.error("Failed to delete news:", error);
      sileo.error({
        title: "Ошибка удаления",
        description: "Не удалось удалить новость",
        duration: 3000,
      });
    }
  };

  const handleTogglePublish = async (
    id: string,
    isPublished: boolean,
    title: string,
  ) => {
    try {
      await togglePublish(id, !isPublished);
      sileo.success({
        title: !isPublished
          ? "Новость опубликована"
          : "Новость снята с публикации",
        description: `"${title}"`,
        duration: 3000,
      });
      loadNews();
    } catch (error) {
      console.error("Failed to toggle publish:", error);
      sileo.error({
        title: "Ошибка",
        description: "Не удалось изменить статус публикации",
        duration: 3000,
      });
    }
  };

  const filteredNews = news.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <DashboardLayout
      onMyRatingsClick={() => navigate("/")}
      showTemplatesNav={false}
      showSearch={false}
      activeItem="Админка"
    >
      <div className="admin-news-page">
        <div className="admin-news-header">
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
            <h1 className="admin-news-title">Управление новостями</h1>
            <p className="admin-news-subtitle">
              Создание, редактирование и публикация новостей
            </p>
          </div>
          <button className="admin-news-create-btn" onClick={handleOpenCreate}>
            <Plus size={20} />
            <span>Создать новость</span>
          </button>
        </div>

        <div className="admin-news-toolbar">
          <div className="admin-news-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Поиск новостей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-news-table-wrapper">
          {loading ? (
            <div className="admin-news-loading">
              <FileText className="animate-pulse" size={48} />
              <p>Загрузка новостей...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="admin-news-empty">
              <FileText size={48} />
              <p>Новостей пока нет</p>
              <button
                className="admin-news-create-btn"
                onClick={handleOpenCreate}
              >
                <Plus size={18} />
                <span>Создать первую новость</span>
              </button>
            </div>
          ) : (
            <table className="admin-news-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Автор</th>
                  <th>Теги</th>
                  <th>Статус</th>
                  <th>Дата публикации</th>
                  <th className="admin-news-actions">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredNews.map((article) => (
                  <tr key={article.id}>
                    <td className="admin-news-title-cell">
                      <span>{article.title}</span>
                    </td>
                    <td>{article.authorName || "—"}</td>
                    <td>
                      <div className="admin-news-tags">
                        {article.tags.map((tag, index) => (
                          <span key={index} className="admin-news-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`admin-news-status-btn ${article.isPublished ? "published" : "draft"}`}
                        onClick={() =>
                          handleTogglePublish(
                            article.id,
                            article.isPublished,
                            article.title,
                          )
                        }
                        title={
                          article.isPublished ? "Опубликовано" : "Черновик"
                        }
                      >
                        {article.isPublished ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>
                    </td>
                    <td>
                      {new Date(article.publishedAt).toLocaleDateString(
                        "ru-RU",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </td>
                    <td className="admin-news-actions">
                      <button
                        className="admin-news-action-btn"
                        onClick={() => handleOpenEdit(article)}
                        title="Редактировать"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="admin-news-action-btn delete"
                        onClick={() => handleDelete(article.id, article.title)}
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

        {totalPages > 1 && (
          <div className="admin-news-pagination">
            <button
              className="admin-news-pagination-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="admin-news-pagination-info">
              Страница {currentPage} из {totalPages}
            </span>
            <button
              className="admin-news-pagination-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {showModal && (
          <div className="admin-news-modal-overlay" onClick={handleCloseModal}>
            <div
              className="admin-news-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-news-modal-header">
                <h2>
                  {editingNews ? "Редактировать новость" : "Создать новость"}
                </h2>
                <button
                  className="admin-news-modal-close"
                  onClick={handleCloseModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-news-form">
                <div className="admin-news-form-group">
                  <label htmlFor="title">Заголовок *</label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Введите заголовок новости"
                    required
                    maxLength={255}
                  />
                </div>

                <div className="admin-news-form-group">
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

                <div className="admin-news-form-group">
                  <label htmlFor="content">Содержание *</label>
                  <WysiwygEditor
                    value={formData.content}
                    onChange={(content) =>
                      setFormData({ ...formData, content })
                    }
                  />
                </div>

                <div className="admin-news-form-row">
                  <div className="admin-news-form-group">
                    <label htmlFor="imageUrl">URL изображения</label>
                    <input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, imageUrl: e.target.value })
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="admin-news-form-group">
                    <label htmlFor="tags">Теги</label>
                    <input
                      id="tags"
                      type="text"
                      value={formData.tags}
                      onChange={(e) =>
                        setFormData({ ...formData, tags: e.target.value })
                      }
                      placeholder="новости, обзоры, события"
                    />
                    <span className="admin-news-form-hint">Через запятую</span>
                  </div>
                </div>

                <div className="admin-news-form-group">
                  <label className="admin-news-checkbox-label">
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

                <div className="admin-news-form-actions">
                  <button
                    type="button"
                    className="admin-news-btn-cancel"
                    onClick={handleCloseModal}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="admin-news-btn-submit"
                    disabled={formLoading}
                  >
                    {formLoading
                      ? "Сохранение..."
                      : editingNews
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
