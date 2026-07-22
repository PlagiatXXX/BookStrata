import type { ReactNode } from "react";
import { X } from "lucide-react";
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
      ? "border-2 border-black bg-[#ff5c8a] px-4 py-2 text-sm font-black text-black hover:bg-[#ff7aa0]"
      : "border-2 border-black bg-[#c1fffe] px-4 py-2 text-sm font-black text-black hover:bg-[#9cf5f3]";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" titleId={titleId}>
      <div className="relative flex w-full flex-col overflow-hidden bg-[#111111] text-[#f6f1e8]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex size-8 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8]"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        <div className="border-b-2 border-black bg-[#181818] px-6 py-5">
          <div className="pr-14">
            <h3
              id={titleId}
              className="text-xl font-black tracking-[-0.03em] text-[#f6f1e8]"
            >
              {title}
            </h3>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-center">
            <img src="/lap.webp" alt="" className="size-[150px] object-contain" />
          </div>
          <div className="text-sm leading-6 text-[#b1b5b6]">{description}</div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-black bg-[#0a0a0a] px-6 py-3 max-sm:flex-col-reverse">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="border-2 border-black bg-transparent px-4 py-2 text-sm font-semibold text-[#b4b4b4] hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8] max-sm:w-full"
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
