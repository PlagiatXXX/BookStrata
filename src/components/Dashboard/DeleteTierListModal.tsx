import { AlertTriangle } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { TierListShort } from "@/lib/tierListApi";

interface DeleteTierListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierList: TierListShort | null;
  onConfirm: (id: number) => void;
  isPending?: boolean;
}

export const DeleteTierListModal = ({
  isOpen,
  onClose,
  tierList,
  onConfirm,
  isPending = false,
}: DeleteTierListModalProps) => {
  if (!tierList) return null;

  const handleConfirm = () => {
    onConfirm(tierList.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Удалить тир-лист?
            </h2>
            <p className="text-gray-400 text-sm">
              Это действие нельзя отменить. Все данные будут безвозвратно удалены.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700/50">
          <p className="text-white font-medium">{tierList.title}</p>
          <p className="text-gray-400 text-sm mt-1">
            {tierList.isPublic ? "Публичный" : "Приватный"} •{" "}
            {new Date(tierList.createdAt).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? (
              <>
                <svg
                  className="mr-2 inline animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    fill="currentColor"
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Удаление...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 inline"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Удалить
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
