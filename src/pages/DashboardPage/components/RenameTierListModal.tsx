import { RefreshCw, X, CheckCircle2 } from "lucide-react";
import { Modal } from "@/ui/Modal";
import type { RenameModalProps } from "../types";

export function RenameTierListModal({
  isOpen,
  onClose,
  onRename,
  renameTitle,
  onTitleChange,
  isPending,
  tierListTitle,
}: RenameModalProps) {
  const trimmedTitle = renameTitle.trim();
  const isSaveDisabled = !trimmedTitle || isPending;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSaveDisabled) {
      e.preventDefault();
      onRename();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="dashboard-modal">
        <button
          onClick={onClose}
          className="dashboard-modal__close"
          type="button"
          aria-label="Закрыть"
          disabled={isPending}
        >
          <X size={16} />
        </button>

        <div>
          <h2>Переименовать тир-лист</h2>
          {tierListTitle && (
            <p className="text-sm text-gray-400 mt-1">
              Текущее название:{" "}
              <span className="text-gray-300">{tierListTitle}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rename-tierlist-title"
            className="text-sm font-medium text-gray-300"
          >
            Новое название
          </label>

          <input
            id="rename-tierlist-title"
            type="text"
            value={renameTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите новое название..."
            className="dashboard-modal__input"
            maxLength={100}
            autoFocus
            disabled={isPending}
            aria-label="Новое название тир-листа"
          />
          <span className="text-xs text-gray-500 text-right">
            {renameTitle.length}/100
          </span>
        </div>

        <div className="dashboard-modal__actions">
          <button
            onClick={onClose}
            disabled={isPending}
            className="dashboard-btn dashboard-btn--ghost"
            type="button"
          >
            Отмена
          </button>
          <button
            onClick={onRename}
            disabled={isSaveDisabled}
            className="dashboard-btn dashboard-btn--primary"
            type="button"
          >
            {isPending ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Сохранение...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
