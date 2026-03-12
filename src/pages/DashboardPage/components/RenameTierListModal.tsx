import { RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/ui/Modal';
import type { RenameModalProps } from '../types';

export function RenameTierListModal({
  isOpen,
  onClose,
  onRename,
  renameTitle,
  onTitleChange,
  isPending,
}: RenameModalProps) {
  const handleRename = () => {
    if (!renameTitle.trim()) {
      alert('Пожалуйста, введите название для тир-листа');
      return;
    }
    onRename();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="dashboard-modal">
        <button
          onClick={onClose}
          className="dashboard-modal__close"
          type="button"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div>
          <h2>Переименовать тир-лист</h2>
          <p>Введите новое название для рейтинга</p>
        </div>

        <input
          type="text"
          value={renameTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
          }}
          placeholder="Новое название тир-листа..."
          className="dashboard-modal__input"
        />

        <div className="dashboard-modal__actions">
          <button
            onClick={onClose}
            className="dashboard-btn dashboard-btn--ghost"
            type="button"
          >
            Отмена
          </button>
          <button
            onClick={handleRename}
            disabled={isPending}
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
