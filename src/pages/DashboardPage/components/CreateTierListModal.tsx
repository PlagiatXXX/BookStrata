import { RefreshCw, X, PlusCircle } from 'lucide-react';
import { Modal } from '@/ui/Modal';
import { sileo } from 'sileo';
import type { CreateModalProps } from '../types';

export function CreateTierListModal({
  isOpen,
  onClose,
  onCreate,
  createTitle,
  onTitleChange,
  isPending,
}: CreateModalProps) {
  const trimmedTitle = createTitle.trim();
  const isCreateDisabled = !trimmedTitle || isPending;

  const handleCreate = () => {
    if (!trimmedTitle) {
      sileo.error({
        title: 'Название обязательно',
        description: 'Пожалуйста, введите название для тир-листа',
        duration: 3000
      });
      return;
    }
    onCreate(createTitle);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isCreateDisabled) {
      e.preventDefault();
      handleCreate();
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
          <h2>Создать новый тир-лист</h2>
          <p>Введите название для вашего нового рейтинга</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="create-tierlist-title" className="text-sm font-medium text-gray-300">
            Название
          </label>

          <input
            id="create-tierlist-title"
            type="text"
            value={createTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Название тир-листа..."
            className="dashboard-modal__input"
            maxLength={100}
            autoFocus
            disabled={isPending}
            aria-label="Название тир-листа"
          />
          <span className="text-xs text-gray-500 text-right">
            {createTitle.length}/100
          </span>
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
            onClick={handleCreate}
            disabled={isCreateDisabled}
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
