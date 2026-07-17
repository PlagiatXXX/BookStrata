import { Eye, X } from "lucide-react";
import { CATEGORIES, COLLECTION_ACCENTS } from "@/data/mockData";
import { WysiwygEditor } from "./WysiwygEditor";
import { CuratedCollectionEditor } from "./CuratedCollectionEditor";
import type { CuratedTier, CuratedBook } from "./types";

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
  isFeatured: boolean;
  order: number;
  editorialNote: string;
  accentColor: string;
}

interface CollectionFormModalProps {
  editingCollection: { id: number; slug: string; updatedAt: string; isPublished: boolean } | null;
  formData: CollectionFormData;
  formLoading: boolean;
  coverUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  curatedTiers: CuratedTier[];
  curatedBooks: CuratedBook[];
  onChangeForm: (data: CollectionFormData) => void;
  onChangeTiers: (tiers: CuratedTier[]) => void;
  onChangeBooks: (books: CuratedBook[]) => void;
  onTypeChange: (type: "curated" | "literary") => void;
  onBookCoverChange: (index: number, value: string) => void;
  onCoverFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CollectionFormModal({
  editingCollection,
  formData,
  formLoading,
  coverUploading,
  fileInputRef,
  curatedTiers,
  curatedBooks,
  onChangeForm,
  onChangeTiers,
  onChangeBooks,
  onTypeChange,
  onBookCoverChange,
  onCoverFileSelect,
  onSubmit,
  onClose,
}: CollectionFormModalProps) {
  const set = (field: keyof CollectionFormData, value: unknown) => {
    onChangeForm({ ...formData, [field]: value });
  };

  return (
    <div className="admin-collections-modal-overlay">
      <div className="admin-collections-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-collections-modal-header">
          <h2>{editingCollection ? "Редактировать коллекцию" : "Создать коллекцию"}</h2>
          <button className="admin-collections-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="admin-collections-form">
          {/* Заголовок */}
          <div className="admin-collections-form-group">
            <label htmlFor="title">Заголовок *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Введите название коллекции"
              required
              maxLength={255}
            />
          </div>

          {/* Краткое описание */}
          <div className="admin-collections-form-group">
            <label htmlFor="excerpt">Краткое описание *</label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder="Краткое описание (до 300 символов)"
              required
              maxLength={300}
              rows={2}
            />
          </div>

          {/* Редакционная заметка */}
          <div className="admin-collections-form-group">
            <label htmlFor="editorialNote">Редакционная заметка</label>
            <textarea
              id="editorialNote"
              value={formData.editorialNote}
              onChange={(e) => set("editorialNote", e.target.value)}
              placeholder="Почему именно эти книги? Как составлялся рейтинг? Что сюда не вошло?"
              rows={4}
            />
            <span className="admin-collections-form-hint">
              Отображается на странице подборки. Уникальный контент для SEO.
            </span>
          </div>

          {/* Тип коллекции */}
          <div className="admin-collections-form-group">
            <label>Тип коллекции</label>
            <div className="curated-editor-type-selector">
              <button
                type="button"
                className={`curated-editor-type-btn ${formData.type === "curated" ? "active" : ""}`}
                onClick={() => onTypeChange("curated")}
              >
                Тир-лист (подборка с рейтингом)
              </button>
              <button
                type="button"
                className={`curated-editor-type-btn ${formData.type === "literary" ? "active" : ""}`}
                onClick={() => onTypeChange("literary")}
              >
                Статья (текстовая подборка)
              </button>
            </div>
          </div>

          {/* Категория */}
          <div className="admin-collections-form-group">
            <label htmlFor="categoryId">Категория (жанр)</label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              <option value="">Без категории</option>
              {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Контент */}
          {formData.type === "literary" ? (
            <div className="admin-collections-form-group">
              <label htmlFor="content">Содержание *</label>
              <WysiwygEditor
                value={formData.content}
                onChange={(content) => set("content", content)}
              />
            </div>
          ) : (
            <div className="admin-collections-form-group">
              <label>Книги и уровни</label>
              <CuratedCollectionEditor
                tiers={curatedTiers}
                books={curatedBooks}
                onTiersChange={onChangeTiers}
                onBooksChange={onChangeBooks}
              />
            </div>
          )}

          {/* Обложка и порядок */}
          <div className="admin-collections-form-row">
            <div className="admin-collections-form-group">
              <label htmlFor="coverImageUrl">URL обложки коллекции</label>
              <div className="flex gap-2 items-start">
                <input
                  id="coverImageUrl"
                  type="text"
                  value={formData.coverImageUrl}
                  onChange={(e) => set("coverImageUrl", e.target.value)}
                  placeholder="/images/collections/nazvanie.webp"
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onCoverFileSelect}
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
                onChange={(e) => set("order", parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>

          {/* Обложки книг (только literary) */}
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
                    onChange={(e) => onBookCoverChange(index, e.target.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Теги */}
          <div className="admin-collections-form-group">
            <label htmlFor="tags">Теги</label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Нобелевская премия, Классика, Лауреаты"
            />
            <span className="admin-collections-form-hint">Через запятую</span>
          </div>

          {/* Чекбоксы */}
          <div className="admin-collections-form-group">
            <label className="admin-collections-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => set("isPublished", e.target.checked)}
              />
              <span>Опубликовать сразу</span>
            </label>
          </div>

          <div className="admin-collections-form-group">
            <label className="admin-collections-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
              />
              <span>Редакционная подборка (показывать на странице Рейтинг книг)</span>
            </label>
          </div>

          {/* Акцентный цвет */}
          <div className="admin-collections-form-group">
            <label>Цвет подсветки карточки</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set("accentColor", "")}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                  !formData.accentColor
                    ? "border-(--accent-main) scale-110"
                    : "border-(--line-soft) hover:border-(--line-strong)"
                }`}
                title="По умолчанию"
                style={{ background: "var(--accent-main)" }}
              >
                A
              </button>
              {COLLECTION_ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("accentColor", color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                    formData.accentColor === color
                      ? "border-white scale-110 ring-2 ring-white/30"
                      : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={`Цвет ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Инфо и предпросмотр при редактировании */}
          {editingCollection && (
            <div className="admin-collections-form-group">
              <div className="flex items-center gap-4 text-sm text-(--ink-2)">
                <span>
                  Последнее обновление:{" "}
                  {new Date(editingCollection.updatedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  className="admin-collections-btn-preview"
                  onClick={() =>
                    window.open(
                      editingCollection.isPublished
                        ? `/collections/${editingCollection.slug}`
                        : `/collections/${editingCollection.slug}?preview=1`,
                      "_blank",
                    )
                  }
                >
                  <Eye size={14} />
                  Предпросмотр
                </button>
              </div>
            </div>
          )}

          {/* Кнопки */}
          <div className="admin-collections-form-actions">
            <button type="button" className="admin-collections-btn-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="admin-collections-btn-submit" disabled={formLoading}>
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
  );
}
