import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Выйти",
  cancelText = "Отмена",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" titleId="confirm-modal-title">
      <div className="relative bg-[#111111]/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-black/20 text-slate-400 hover:text-white transition-colors"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#ffbd58]/20 text-[#ffbd58]">
              <AlertTriangle size={20} />
            </div>
          </div>

          <h3 className="text-xl font-bold text-[#f6f1e8] mb-2">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-800/50 bg-[#0a0a0a]/80">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border border-slate-700/50 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/50"
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-[#c1fffe] text-black py-2 text-sm font-bold hover:bg-[#9cf5f3]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}