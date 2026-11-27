import { useRef, useState } from "react";
import { RefreshCw, X, Trash2 } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { triggerDustDisintegrate } from "@/components/DustDelete";
import type { DeleteModalProps } from "../types";

export function DeleteTierListModal({
  isOpen,
  onClose,
  onDelete,
  tierListTitle,
  isPending,
}: DeleteModalProps) {
  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevIsPending, setPrevIsPending] = useState(isPending);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setIsDisintegrating(false);
    }
  }

  if (isPending !== prevIsPending) {
    setPrevIsPending(isPending);
    if (prevIsPending && !isPending && isOpen) {
      setIsDisintegrating(false);
    }
  }

  const handleConfirmDelete = () => {
    if (isDisintegrating || isPending) return;
    if (modalCardRef.current) {
      triggerDustDisintegrate(modalCardRef.current, { stepPx: 3 });
    }
    setIsDisintegrating(true);
    onDelete();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="delete-modal-title"
      isClosing={isDisintegrating}
    >
      <div
        ref={modalCardRef}
        className={`dashboard-modal relative bg-[#111111]/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl ${
          isDisintegrating ? "opacity-0 pointer-events-none" : ""
        }`}
      >
        <button
          onClick={onClose}
          className="dashboard-modal__close"
          type="button"
          aria-label="Закрыть"
          disabled={isDisintegrating || isPending}
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <img src="/lap.webp" alt="" className="size-[150px] object-contain mb-4" />
          <h2 id="delete-modal-title">Удалить тир-лист</h2>
          <p>
            Это действие нельзя отменить. Рейтинг{" "}
            <strong>{tierListTitle}</strong> будет удален навсегда.
          </p>
        </div>

        <div className="dashboard-modal__actions">
          <button
            onClick={onClose}
            className="dashboard-btn dashboard-btn--ghost"
            type="button"
            disabled={isDisintegrating || isPending}
          >
            Отмена
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={isDisintegrating || isPending}
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
