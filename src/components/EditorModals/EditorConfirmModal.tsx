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
      ? "nb-heavy-border bg-(--theme-danger) px-4 py-2 text-sm font-black text-(--theme-on-accent) hover:bg-(--theme-danger)/90"
      : "nb-heavy-border bg-(--theme-accent-primary) px-4 py-2 text-sm font-black text-(--theme-on-accent) hover:bg-(--theme-accent-primary)/90";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" titleId={titleId}>
      <div className="relative flex w-full flex-col overflow-hidden nb-heavy-border bg-(--theme-surface-3) text-(--theme-text)">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex size-8 cursor-pointer items-center justify-center nb-heavy-border bg-(--theme-surface-4) text-(--theme-text-muted) transition-colors hover:border-(--theme-accent-primary) hover:text-(--theme-text)"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        <div className="border-b-(--theme-border-width) border-(--theme-border) bg-(--theme-surface-2) px-6 py-5">
          <div className="pr-14">
            <h3
              id={titleId}
              className="text-xl font-black tracking-[-0.03em] text-(--theme-text)"
            >
              {title}
            </h3>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-center">
            <img src="/lap.webp" alt="" className="size-[150px] object-contain" />
          </div>
          <div className="text-sm leading-6 text-(--theme-text-muted)">{description}</div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t-(--theme-border-width) border-(--theme-border) bg-(--theme-surface-4) px-6 py-3 max-sm:flex-col-reverse">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="nb-heavy-border bg-transparent px-4 py-2 text-sm font-semibold text-(--theme-text-muted) hover:border-(--theme-accent-primary) hover:bg-(--theme-surface-2) hover:text-(--theme-text) max-sm:w-full"
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
