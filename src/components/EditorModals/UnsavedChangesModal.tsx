import { X } from "lucide-react";
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      titleId="unsaved-changes-title"
    >
      <div className="relative flex w-full flex-col overflow-hidden bg-[#111111] text-[#f6f1e8]">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8]"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        <div className="border-b-2 border-black bg-[#181818] px-6 py-5">
          <div className="pr-14">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]">
              Несохраненные изменения
            </p>
            <h3
              id="unsaved-changes-title"
              className="text-2xl font-black tracking-[-0.03em] text-[#f6f1e8]"
            >
              Сохранить перед выходом?
            </h3>
          </div>
        </div>

        <div className="p-6">
          <div className="border-2 border-black bg-[#171717] p-4">
            <div className="mb-4 flex items-center justify-center">
              <img src="/lap.webp" alt="" className="size-[150px] object-contain" />
            </div>
            <div className="text-sm leading-6 text-[#b1b5b6]">
              {isUpdatingBook ? (
                <p>Идет сохранение книги...</p>
              ) : (
                <>
                  <p>Вы уверены, что хотите уйти?</p>
                  <p className="mt-3">
                    Изменения будут потеряны, если не сохранить их сейчас.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-black bg-[#0a0a0a] px-6 py-5">
          <Button
            variant="primary"
            onClick={onSaveAndLeave}
            disabled={isUpdatingBook || isSaving}
            className="border-2 border-black bg-[#c1fffe] px-5 py-3 font-black text-black hover:bg-[#9cf5f3] hover:text-black"
          >
            {isSaving ? "Сохранение..." : "Сохранить и выйти"}
          </Button>
          <Button
            variant="ghost"
            onClick={onConfirm}
            disabled={isUpdatingBook || isSaving}
            className="border-2 border-black bg-transparent px-5 py-3 font-semibold text-[#f6f1e8] hover:border-[#ff5c8a] hover:bg-[#171717]"
          >
            Выйти без сохранения
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isUpdatingBook || isSaving}
            autoFocus
            className="border-2 border-black bg-transparent px-5 py-3 font-semibold text-[#b4b4b4] hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8]"
          >
            Остаться
          </Button>
        </div>
      </div>
    </Modal>
  );
}
