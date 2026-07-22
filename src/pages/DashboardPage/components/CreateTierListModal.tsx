import { useState } from "react";
import { RefreshCw, X, PlusCircle } from 'lucide-react';
import { motion } from "framer-motion";
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
  const [showError, setShowError] = useState(false);
  const trimmedTitle = createTitle.trim();
  const isCreateDisabled = isPending;

  const handleCreate = () => {
    if (!trimmedTitle) {
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
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
    <Modal isOpen={isOpen} onClose={onClose} titleId="create-modal-title" maxWidth="sm">
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
          <h2 id="create-modal-title">Создать новый тир-лист</h2>
          <p>Введите название для вашего нового рейтинга</p>
        </div>

        <motion.div
          className="flex flex-col gap-1.5"
          animate={showError ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
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
            className={`dashboard-modal__input transition-colors ${showError ? "border-red-500! ring-2 ring-red-500/20" : ""}`}
            maxLength={100}
            disabled={isPending}
            aria-label="Название тир-листа"
          />
          <span className="text-xs text-gray-500 text-right">
            {createTitle.length}/100
          </span>
        </motion.div>

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
