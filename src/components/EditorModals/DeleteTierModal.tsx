import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";

interface DeleteTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tierTitle?: string;
}

export function DeleteTierModal({
  isOpen,
  onClose,
  onConfirm,
  tierTitle,
}: DeleteTierModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" titleId="delete-tier-title">
      <div className="relative flex flex-col items-center p-6 text-center text-[#d8f9ff]">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex size-8 cursor-pointer items-center justify-center rounded-lg border border-cyan-300/45 text-cyan-200/80 transition-colors hover:border-fuchsia-300/70 hover:text-fuchsia-200"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="mb-4 mt-2">
          <div className="rounded-xl border border-fuchsia-300/45 bg-[rgba(255,0,204,0.12)] p-3">
            <AlertTriangle size={28} className="text-fuchsia-200" />
          </div>
        </div>

        <h3 id="delete-tier-title" className="mb-2 text-xl font-bold tracking-[-0.02em] text-[#e8ffff]">
          Удалить тир?
        </h3>

        <p className="mb-6 text-cyan-200/75">
          {tierTitle ? (
            <>
              Вы уверены, что хотите удалить тир{" "}
              <span className="font-semibold text-cyan-100">"{tierTitle}"</span>?
            </>
          ) : (
            "Вы уверены, что хотите удалить этот тир?"
          )}
          <br />
          Все книги из него будут перемещены в блок «Книги без рейтинга».
          <br />
          Это действие нельзя отменить.
        </p>

        <div className="flex w-full gap-3">
          <Button variant="outline" onClick={onClose} className="y2k-btn-ghost flex-1">
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-fuchsia-300/70 bg-[rgba(255,0,204,0.16)] text-fuchsia-100 hover:bg-[rgba(255,0,204,0.25)]"
          >
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  );
}
