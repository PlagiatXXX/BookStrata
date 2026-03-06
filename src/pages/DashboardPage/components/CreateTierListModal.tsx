import { RefreshCw, X, PlusCircle } from 'lucide-react';
import { Modal } from '@/ui/Modal';
import type { CreateModalProps } from '../types';

export function CreateTierListModal({
  isOpen,
  onClose,
  onCreate,
  createTitle,
  onTitleChange,
  isPending,
}: CreateModalProps) {
  const handleCreate = () => {
    if (!createTitle.trim()) {
      alert('Пожалуйста, введите название для тир-листа');
      return;
    }
    onCreate(createTitle);
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
          <h2>Создать новый тир-лист</h2>
          <p>Введите название для вашего нового рейтинга</p>
        </div>

        <input
          type="text"
          value={createTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="Название тир-листа..."
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
            onClick={handleCreate}
            disabled={isPending}
            className="dashboard-btn dashboard-btn--primary"
            type="button"
          >
            {isPending ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Создание...
              </>
            ) : (
              <>
                <PlusCircle size={16} />
                Создать
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
