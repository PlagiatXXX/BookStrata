import { X } from "lucide-react";
import type { CuratedBook } from "./types";

interface EditBookModalProps {
  editForm: CuratedBook;
  onFieldChange: (form: CuratedBook) => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditBookModal({ editForm, onFieldChange, onSave, onClose }: EditBookModalProps) {
  const set = (field: keyof CuratedBook, value: unknown) => {
    onFieldChange({ ...editForm, [field]: value });
  };

  return (
    <div className="admin-collections-modal-overlay">
      <div
        className="admin-collections-modal curated-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-collections-modal-header">
          <h2>Редактировать книгу</h2>
          <button className="admin-collections-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-collections-form">
          <div className="admin-collections-form-row">
            <div className="admin-collections-form-group">
              <label>Автор</label>
              <input
                type="text"
                value={editForm.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Имя автора"
              />
            </div>
            <div className="admin-collections-form-group">
              <label>Название *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Название книги"
              />
            </div>
          </div>

          <div className="admin-collections-form-row">
            <div className="admin-collections-form-group">
              <label>Жанр</label>
              <input
                type="text"
                value={editForm.genre || ""}
                onChange={(e) => set("genre", e.target.value)}
                placeholder="Фэнтези, детектив..."
              />
            </div>
            <div className="admin-collections-form-group">
              <label>Теги (через запятую)</label>
              <input
                type="text"
                value={editForm.tags || ""}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="магия, приключения, эпос"
              />
            </div>
          </div>

          <div className="admin-collections-form-group">
            <label>URL обложки</label>
            <input
              type="text"
              value={editForm.coverImageUrl}
              onChange={(e) => set("coverImageUrl", e.target.value)}
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
              onChange={(e) => set("description", e.target.value)}
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
                set("rating", e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder="8.5"
            />
          </div>

          <div className="admin-collections-form-actions">
            <button type="button" className="admin-collections-btn-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="button" className="admin-collections-btn-submit" onClick={onSave}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
