import { useCallback, useRef, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { CuratedCollectionEditor } from "@/pages/AdminCollectionsPage/components/CuratedCollectionEditor";
import type { CuratedTier, CuratedBook } from "@/pages/AdminCollectionsPage/components/types";
import { CELEBRITY_CATEGORIES } from "@/lib/celebritiesApi";
import type { CelebrityItem } from "@/lib/celebritiesApi";

interface CelebrityFormData {
  name: string;
  photoUrl: string;
  biography: string;
  category: string;
  isPublished: boolean;
  order: number;
}

interface CelebrityFormModalProps {
  editingCelebrity: CelebrityItem | null;
  formData: CelebrityFormData;
  formLoading: boolean;
  photoUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  curatedTiers: CuratedTier[];
  curatedBooks: CuratedBook[];
  onChangeForm: React.Dispatch<React.SetStateAction<CelebrityFormData>>;
  onChangeTiers: (tiers: CuratedTier[]) => void;
  onChangeBooks: (books: CuratedBook[]) => void;
  onPhotoFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CelebrityFormModal({
  editingCelebrity,
  formData,
  formLoading,
  photoUploading,
  fileInputRef,
  curatedTiers,
  curatedBooks,
  onChangeForm,
  onChangeTiers,
  onChangeBooks,
  onPhotoFileSelect,
  onSubmit,
  onClose,
}: CelebrityFormModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === modalRef.current) onClose();
    },
    [onClose],
  );

  return (
    <div className="celebrity-modal-overlay" ref={modalRef} onClick={handleBackdrop}>
      <div className="celebrity-modal">
        <div className="celebrity-modal-header">
          <h2>{editingCelebrity ? "Редактировать знаменитость" : "Создать знаменитость"}</h2>
          <button onClick={onClose} className="celebrity-modal-close" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="celebrity-modal-form">
          <div className="celebrity-modal-form-body">
            {/* Основная информация */}
            <div className="celebrity-form-section">
              <h3>Основная информация</h3>

              <div className="celebrity-form-row">
                <label className="celebrity-form-label">Имя и фамилия</label>
                <input
                  type="text"
                  className="celebrity-form-input"
                  value={formData.name}
                  onChange={(e) => onChangeForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Киану Ривз"
                  required
                />
              </div>

              <div className="celebrity-form-row">
                <label className="celebrity-form-label">Категория</label>
                <select
                  className="celebrity-form-input"
                  value={formData.category}
                  onChange={(e) => onChangeForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Без категории</option>
                  {Object.entries(CELEBRITY_CATEGORIES)
                    .filter(([key]) => key !== "all")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="celebrity-form-row">
                <label className="celebrity-form-label">Биография</label>
                <textarea
                  className="celebrity-form-textarea"
                  value={formData.biography}
                  onChange={(e) => onChangeForm((prev) => ({ ...prev, biography: e.target.value }))}
                  placeholder="Краткая биография знаменитости, интересные факты..."
                  rows={4}
                />
              </div>
            </div>

            {/* Фото */}
            <div className="celebrity-form-section">
              <h3>Фото</h3>

              {formData.photoUrl && (
                <div className="celebrity-photo-preview">
                  <img src={formData.photoUrl} alt="Preview" />
                </div>
              )}

              <div className="celebrity-form-row">
                <label className="celebrity-form-label">URL фото</label>
                <input
                  type="text"
                  className="celebrity-form-input"
                  value={formData.photoUrl}
                  onChange={(e) => onChangeForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="celebrity-form-row">
                <label className="celebrity-form-label">Или загрузить файл</label>
                <div className="celebrity-form-file-row">
                  <input
                    ref={fileInputRef as React.RefObject<HTMLInputElement>}
                    type="file"
                    accept="image/*"
                    onChange={onPhotoFileSelect}
                    className="celebrity-form-file-input"
                  />
                  <button
                    type="button"
                    className="celebrity-form-file-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                  >
                    <Upload size={14} />
                    {photoUploading ? "Загрузка..." : "Выбрать файл"}
                  </button>
                </div>
              </div>
            </div>

            {/* Настройки публикации */}
            <div className="celebrity-form-section">
              <h3>Настройки</h3>

              <div className="celebrity-form-row checkbox-row">
                <label className="celebrity-form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => onChangeForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  />
                  <span>Опубликовано</span>
                </label>
              </div>

              <div className="celebrity-form-row">
                <label className="celebrity-form-label">Порядок сортировки</label>
                <input
                  type="number"
                  className="celebrity-form-input celebrity-form-input--short"
                  value={formData.order}
                  onChange={(e) => onChangeForm((prev) => ({ ...prev, order: Number(e.target.value) }))}
                  min={0}
                />
              </div>
            </div>

            {/* Тир-лист книг */}
            <p className="celebrity-form-hint" style={{ marginBottom: '0.75rem' }}>
              Добавьте книги, которые упоминала эта знаменитость. Разделите их по уровням (S — лучшее, A, B, C...).
            </p>
            <CuratedCollectionEditor
              tiers={curatedTiers}
              books={curatedBooks}
              onTiersChange={onChangeTiers}
              onBooksChange={onChangeBooks}
            />

            {/* Footer кнопки внутри скролла */}
            <div className="celebrity-form-footer">
              <button
                type="button"
                onClick={onClose}
                className="celebrity-form-btn cancel"
                disabled={formLoading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="celebrity-form-btn submit"
                disabled={formLoading}
              >
                {formLoading
                  ? "Сохранение..."
                  : editingCelebrity
                    ? "Сохранить"
                    : "Создать"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
