import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSaveAndLeave: () => void;
  isUpdatingBook?: boolean;
  isSaving?: boolean;
}

export function UnsavedChangesModal({
  isOpen,
  onClose,
  onConfirm,
  onSaveAndLeave,
  isUpdatingBook,
  isSaving,
}: UnsavedChangesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" titleId="unsaved-changes-title">
      <div className="relative flex flex-col items-center p-6 text-center text-[#d8f9ff]">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex size-8 cursor-pointer items-center justify-center rounded-lg border border-cyan-300/45 text-cyan-200/80 transition-colors hover:border-fuchsia-300/70 hover:text-fuchsia-200"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="mb-4 mt-2">
          <div className="rounded-xl border border-amber-300/45 bg-[rgba(250,204,21,0.12)] p-3">
            <AlertTriangle size={28} className="text-amber-200" />
          </div>
        </div>

        <h3 id="unsaved-changes-title" className="mb-2 text-xl font-bold tracking-[-0.02em] text-[#e8ffff]">
          Есть несохраненные изменения
        </h3>

        <p className="mb-6 text-cyan-200/75">
          {isUpdatingBook ? (
            "Идет сохранение книги..."
          ) : (
            <>
              Вы уверены, что хотите уйти?
              <br />
              Изменения будут потеряны, если не сохранить.
            </>
          )}
        </p>

        <div className="flex w-full flex-col gap-3">
          <Button
            variant="primary"
            onClick={onSaveAndLeave}
            disabled={isUpdatingBook || isSaving}
            className="y2k-btn-primary flex-1"
          >
            {isSaving ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Сохранение...
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                Сохранить и выйти
              </>
            )}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdatingBook || isSaving}
              className="y2k-btn-ghost flex-1"
            >
              Остаться
            </Button>
            <Button
              variant="outline"
              onClick={onConfirm}
              disabled={isUpdatingBook || isSaving}
              className="y2k-btn-outline flex-1"
            >
              Уйти без сохранения
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
