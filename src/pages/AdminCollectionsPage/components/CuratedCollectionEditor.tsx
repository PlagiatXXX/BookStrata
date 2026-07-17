import { Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import { DndContext, pointerWithin } from "@dnd-kit/core";

import type { CuratedCollectionEditorProps } from "./types";
import { TIER_COLORS } from "./types";
import { DroppableTierGroup } from "./DroppableTierGroup";
import { BookRow } from "./BookRow";
import { EditBookModal } from "./EditBookModal";
import { JsonImportModal } from "./JsonImportModal";
import { ParseUrlModal } from "./ParseUrlModal";
import { useCollectionEditor } from "../hooks/useCollectionEditor";

export function CuratedCollectionEditor({
  tiers,
  books,
  onTiersChange,
  onBooksChange,
}: CuratedCollectionEditorProps) {
  const h = useCollectionEditor(tiers, books, onTiersChange, onBooksChange);

  return (
    <div className="curated-editor">
      {/* === Тиры === */}
      <div className="curated-editor-section">
        <div className="curated-editor-section-header">
          <h3>Уровни (тиры)</h3>
          <button type="button" className="curated-editor-add-btn" onClick={h.handleAddTier}>
            <Plus size={14} />
            Добавить уровень
          </button>
        </div>

        {tiers.length === 0 && (
          <p className="curated-editor-empty">
            Нет уровней. Добавьте хотя бы один уровень для книг.
          </p>
        )}

        <div className="curated-editor-tiers-list">
          {tiers.map((tier, idx) => (
            <div key={tier.id} className="curated-editor-tier-row">
              <span className="curated-editor-tier-index">{idx + 1}</span>
              <input
                type="text"
                className="curated-editor-input"
                value={tier.title}
                onChange={(e) => h.handleUpdateTier(tier.id, "title", e.target.value)}
                placeholder="Название уровня (S, A, B...)"
              />
              <div className="curated-editor-color-picker">
                {TIER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`curated-editor-color-btn ${tier.color === c.value ? "active" : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => h.handleUpdateTier(tier.id, "color", c.value)}
                    title={c.label}
                  />
                ))}
              </div>
              <button
                type="button"
                className="curated-editor-delete-btn"
                onClick={() => h.handleDeleteTier(tier.id)}
                title="Удалить уровень"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* === Книги === */}
      <div className="curated-editor-section">
        <div className="curated-editor-section-header">
          <h3>Книги</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="curated-editor-add-btn curated-editor-add-btn--secondary"
              onClick={h.handleOpenParseUrl}
            >
              <ExternalLink size={14} />
              Импорт по ссылке
            </button>
            <button
              type="button"
              className="curated-editor-add-btn curated-editor-add-btn--secondary"
              onClick={h.handleOpenJsonImport}
            >
              <Upload size={14} />
              Импорт JSON
            </button>
            <button type="button" className="curated-editor-add-btn" onClick={h.handleAddBook}>
              <Plus size={14} />
              Добавить книгу
            </button>
          </div>
        </div>

        <DndContext collisionDetection={pointerWithin} onDragEnd={h.handleDragEnd}>
          {tiers.map((tier) => {
            const tierBooks = h.booksByTier.grouped[tier.id] || [];
            if (tierBooks.length === 0) return null;
            return (
              <DroppableTierGroup key={tier.id} tierId={tier.id} label={tier.title} color={tier.color}>
                {tierBooks.map((book) => (
                  <BookRow
                    key={book.id}
                    book={book}
                    tiers={tiers}
                    onUpdate={h.handleUpdateBook}
                    onDelete={h.handleDeleteBook}
                    onMove={h.handleMoveBook}
                    onEdit={h.handleOpenEdit}
                    draggable
                  />
                ))}
              </DroppableTierGroup>
            );
          })}

          {h.booksByTier.unranked.length > 0 && (
            <DroppableTierGroup tierId="__unranked__" label="Без уровня" color="transparent" unranked>
              {h.booksByTier.unranked.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  tiers={tiers}
                  onUpdate={h.handleUpdateBook}
                  onDelete={h.handleDeleteBook}
                  onMove={h.handleMoveBook}
                  onEdit={h.handleOpenEdit}
                  draggable
                />
              ))}
            </DroppableTierGroup>
          )}
        </DndContext>
      </div>

      {/* === Модалки === */}
      {h.showJsonImport && (
        <JsonImportModal
          value={h.jsonImportText}
          error={h.jsonImportError}
          textareaRef={h.jsonTextareaRef}
          onChange={(value) => {
            h.setJsonImportText(value);
            h.setJsonImportError(null);
          }}
          onImport={h.handleJsonImport}
          onClose={h.handleCloseJsonImport}
        />
      )}

      {h.showParseUrl && (
        <ParseUrlModal
          url={h.parseUrl}
          loading={h.parseUrlLoading}
          error={h.parseUrlError}
          parsedBooks={h.parsedBooks}
          coversLoading={h.coversLoading}
          coversFeedback={h.coversFeedback}
          onUrlChange={(value) => {
            h.setParseUrl(value);
            h.setParseUrlError(null);
          }}
          onParse={h.handleParseUrl}
          onFetchCovers={h.handleFetchCovers}
          onImport={h.handleImportParsedBooks}
          onClose={h.handleCloseParseUrl}
        />
      )}

      {h.editingBook && h.editForm && (
        <EditBookModal
          editForm={h.editForm}
          onFieldChange={h.setEditForm}
          onSave={h.handleSaveEdit}
          onClose={h.handleCloseEdit}
        />
      )}
    </div>
  );
}
