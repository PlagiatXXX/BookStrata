import { Plus, FileText, Eye, EyeOff, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { CollectionItem } from "@/types/collection";

interface CollectionListProps {
  collections: CollectionItem[];
  loading: boolean;
  typeFilter: "all" | "curated" | "literary";
  isAdmin: boolean;
  onSetTypeFilter: (filter: "all" | "curated" | "literary") => void;
  onOpenCreate: (presetType?: "curated" | "literary") => void;
  onOpenEdit: (collection: CollectionItem) => void;
  onTogglePublish: (id: number, isPublished: boolean, title: string) => void;
  onDeleteConfirm: (item: { id: number; title: string }) => void;
}

export function CollectionList({
  collections,
  loading,
  typeFilter,
  isAdmin,
  onSetTypeFilter,
  onOpenCreate,
  onOpenEdit,
  onTogglePublish,
  onDeleteConfirm,
}: CollectionListProps) {
  const location = useLocation();

  return (
    <>
      {/* Шапка с навигацией и фильтрами */}
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

          <div className="admin-collections-subtabs">
            {(["all", "literary", "curated"] as const).map((f) => (
              <button
                key={f}
                className={`admin-collections-subtab ${typeFilter === f ? "active" : ""}`}
                onClick={() => onSetTypeFilter(f)}
              >
                {f === "all" ? "Все" : f === "literary" ? "Статьи" : "Тир-листы"}
              </button>
            ))}
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

        <button className="admin-collections-create-btn" onClick={() => onOpenCreate()}>
          <Plus size={20} />
          <span>
            {typeFilter === "literary" && "Создать статью"}
            {typeFilter === "curated" && "Создать тир-лист"}
            {typeFilter === "all" && "Создать"}
          </span>
        </button>
      </div>

      {/* Таблица или пустое состояние */}
      <div className="admin-collections-table-wrapper">
        {loading ? (
          <div className="admin-collections-loading">
            <FileText className="animate-pulse" size={48} />
            <p>Загрузка...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="admin-collections-empty">
            <FileText size={48} />
            <p>
              {typeFilter === "all" && "Коллекций пока нет"}
              {typeFilter === "literary" && "Литературных подборок пока нет"}
              {typeFilter === "curated" && "Тир-листов пока нет"}
            </p>
            <button className="admin-collections-create-btn" onClick={() => onOpenCreate()}>
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
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <td className="admin-collections-title-cell" data-label="Название">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenEdit(collection)}
                        className="admin-collections-title-link"
                        title="Редактировать"
                      >
                        {collection.title}
                      </button>
                      <span className={`admin-collections-type-badge ${collection.type}`}>
                        {collection.type === "curated" ? "Тир-лист" : "Статья"}
                      </span>
                    </div>
                  </td>
                  <td data-label="Теги">
                    <div className="admin-collections-tags">
                      {collection.tags.map((tag: string, index: number) => (
                        <span key={index} className="admin-collections-tag">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td data-label="Порядок">{collection.order}</td>
                  <td data-label="Статус">
                    <button
                      className={`admin-collections-status-btn ${collection.isPublished ? "published" : "draft"}`}
                      onClick={() => onTogglePublish(collection.id, collection.isPublished, collection.title)}
                      title={collection.isPublished ? "Опубликовано" : "Черновик"}
                    >
                      {collection.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </td>
                  <td data-label="Обновлено">
                    {new Date(collection.updatedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="admin-collections-actions" data-label="Действия">
                    <button
                      onClick={() => onOpenEdit(collection)}
                      className="cursor-pointer text-gray-400 hover:text-cyan-400 transition-colors"
                      title="Редактировать"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteConfirm({ id: collection.id, title: collection.title })}
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
    </>
  );
}
