import { RefreshCw, X, Trash2 } from 'lucide-react';
import { Modal } from '@/ui/Modal';
import type { DeleteModalProps } from '../types';

export function DeleteTierListModal({
  isOpen,
  onClose,
  onDelete,
  tierListTitle,
  isPending,
}: DeleteModalProps) {
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
          <h2>Удалить тир-лист</h2>
          <p>
            Это действие нельзя отменить. Рейтинг{' '}
            <strong>{tierListTitle}</strong> будет удален навсегда.
          </p>
        </div>

        <div className="dashboard-modal__actions">
          <button
            onClick={onClose}
            className="dashboard-btn dashboard-btn--ghost"
            type="button"
            disabled={isPending}
          >
            Отмена
          </button>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="dashboard-btn dashboard-btn--danger"
            type="button"
          >
            {isPending ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Удаление...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Удалить
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
