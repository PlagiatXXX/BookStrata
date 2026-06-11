import { X, AlertTriangle } from "lucide-react";
import { Modal } from "@/ui/Modal";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      titleId="unsaved-changes-title"
    >
      <div className="relative flex w-full flex-col overflow-hidden bg-[#111111] text-[#f6f1e8]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex size-8 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8]"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 border-b-2 border-black bg-[#181818] px-5 py-4 pr-14">
          <div className="flex size-10 shrink-0 items-center justify-center border-2 border-black bg-[#ffbd58] text-black">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]">
              Несохраненные изменения
            </p>
            <h3
              id="unsaved-changes-title"
              className="text-lg font-black tracking-[-0.03em] text-[#f6f1e8]"
            >
              Сохранить перед выходом?
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="shrink-0">
            <img src="/lap.webp" alt="" className="size-28 object-contain" />
          </div>
          <p className="text-sm leading-5 text-[#b1b5b6]">
            {isUpdatingBook
              ? "Идет сохранение книги..."
              : "Изменения будут потеряны, если не сохранить их сейчас."}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t-2 border-black bg-[#0a0a0a] px-5 py-4">
          <button
            onClick={onSaveAndLeave}
            disabled={isUpdatingBook || isSaving}
            className="nb-heavy-border w-full cursor-pointer bg-[#c1fffe] px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-black transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Сохранение..." : "Сохранить и выйти"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              disabled={isUpdatingBook || isSaving}
              className="nb-heavy-border flex-1 cursor-pointer bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#f6f1e8] transition-all hover:-translate-y-0.5 hover:border-[#ff5c8a] hover:bg-[#171717] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Выйти без сохранения
            </button>
            <button
              onClick={onClose}
              disabled={isUpdatingBook || isSaving}
              autoFocus
              className="nb-heavy-border flex-1 cursor-pointer bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#b4b4b4] transition-all hover:-translate-y-0.5 hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Остаться
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
