import { X } from "lucide-react";

interface JsonImportModalProps {
  value: string;
  error: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onImport: () => void;
  onClose: () => void;
}

export function JsonImportModal({
  value,
  error,
  textareaRef,
  onChange,
  onImport,
  onClose,
}: JsonImportModalProps) {
  return (
    <div className="admin-collections-modal-overlay" onClick={onClose}>
      <div
        className="admin-collections-modal curated-edit-modal"
        style={{ maxWidth: "650px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-collections-modal-header">
          <h2>Импорт книг из JSON</h2>
          <button className="admin-collections-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-collections-form">
          <div className="admin-collections-form-group">
            <label>Вставьте JSON-массив книг</label>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              placeholder={`[\n  { "title": "Война и мир", "author": "Лев Толстой", "genre": "классика" },\n  { "title": "Преступление и наказание", "author": "Ф. Достоевский", "genre": "классика" }\n]`}
              rows={12}
              style={{ fontFamily: "monospace", fontSize: "0.8rem", lineHeight: "1.5" }}
            />
            {error && <p className="admin-collections-form-error">{error}</p>}
            <span className="admin-collections-form-hint">
              Формат: массив объектов с полем <strong>title</strong> (обязательно).
              Опционально: author, genre, description, coverImageUrl, rating, tags.
            </span>
          </div>

          <div className="admin-collections-form-actions">
            <button type="button" className="admin-collections-btn-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="button" className="admin-collections-btn-submit" onClick={onImport}>
              Импортировать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
