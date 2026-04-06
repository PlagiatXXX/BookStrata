import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";

interface EditorConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  titleId: string;
  confirmVariant?: "destructive" | "primary";
  isProcessing?: boolean;
  processingLabel?: string;
}

export function EditorConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  titleId,
  confirmVariant = "destructive",
  isProcessing = false,
  processingLabel,
}: EditorConfirmModalProps) {
  const confirmClassName =
    confirmVariant === "destructive"
      ? "border-2 border-black bg-[#ff5c8a] px-5 py-3 font-black text-black hover:bg-[#ff7aa0]"
      : "border-2 border-black bg-[#c1fffe] px-5 py-3 font-black text-black hover:bg-[#9cf5f3]";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" titleId={titleId}>
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
              Подтверждение действия
            </p>
            <h3
              id={titleId}
              className="text-2xl font-black tracking-[-0.03em] text-[#f6f1e8]"
            >
              {title}
            </h3>
          </div>
        </div>

        <div className="p-6">
          <div className="border-2 border-black bg-[#171717] p-4">
            <div className="mb-4 flex size-12 items-center justify-center border-2 border-black bg-[#ffbd58] text-black">
              <AlertTriangle size={24} />
            </div>
            <div className="text-sm leading-6 text-[#b1b5b6]">{description}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t-2 border-black bg-[#0a0a0a] px-6 py-5 max-sm:flex-col-reverse">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="border-2 border-black bg-transparent px-5 py-3 font-semibold text-[#b4b4b4] hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8] max-sm:w-full"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant === "destructive" ? "destructive" : "primary"}
            onClick={onConfirm}
            disabled={isProcessing}
            className={`${confirmClassName} max-sm:w-full`}
          >
            {isProcessing ? processingLabel || confirmLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
