import { X } from "lucide-react";

interface ParseUrlModalProps {
  url: string;
  loading: boolean;
  error: string | null;
  parsedBooks: { title: string; author: string; coverImageUrl: string }[] | null;
  coversLoading: boolean;
  coversFeedback: string | null;
  onUrlChange: (url: string) => void;
  onParse: () => void;
  onFetchCovers: () => void;
  onImport: () => void;
  onClose: () => void;
}

export function ParseUrlModal({
  url,
  loading,
  error,
  parsedBooks,
  coversLoading,
  coversFeedback,
  onUrlChange,
  onParse,
  onFetchCovers,
  onImport,
  onClose,
}: ParseUrlModalProps) {
  return (
    <div className="admin-collections-modal-overlay" onClick={onClose}>
      <div
        className="admin-collections-modal curated-edit-modal"
        style={{ maxWidth: "650px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-collections-modal-header">
          <h2>Импорт книг по ссылке</h2>
          <button className="admin-collections-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-collections-form">
          <div className="admin-collections-form-group">
            <label>Ссылка на статью с подборкой книг</label>
            <input
              type="url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://www.livelib.ru/selection/..."
            />
            <span className="admin-collections-form-hint">
              Поддерживаются Livelib, Readrate, Fantlab, LitRes, Wikipedia и другие сайты.
              Парсятся заголовки и списки.
            </span>
          </div>

          {loading && (
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Загрузка и парсинг страницы...</p>
          )}

          {error && <p className="admin-collections-form-error">{error}</p>}

          {parsedBooks && !loading && (
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
            <button type="button" className="admin-collections-btn-cancel" onClick={onClose}>
              Отмена
            </button>
            {parsedBooks && !loading ? (
              <>
                <button
                  type="button"
                  className="admin-collections-btn-cancel"
                  onClick={onFetchCovers}
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
                  onClick={onImport}
                >
                  Импортировать {parsedBooks.length} книг
                </button>
              </>
            ) : (
              <button
                type="button"
                className="admin-collections-btn-submit"
                onClick={onParse}
                disabled={loading}
              >
                {loading ? "Загрузка..." : "Найти книги"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
