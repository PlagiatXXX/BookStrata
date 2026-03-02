import { memo } from "react";
import { Edit2, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { TierListShort } from '@/lib/tierListApi';
import { Spinner } from "@/components/Spinner";

interface RenameTierListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierList: TierListShort | null;
  title: string;
  onTitleChange: (value: string) => void;
  onRename: () => void;
  isPending: boolean;
}

export const RenameTierListModal = memo(({
  isOpen,
  onClose,
  tierList,
  title,
  onTitleChange,
  onRename,
  isPending,
}: RenameTierListModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="rename-tierlist-title">
      <div className="relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#b8b1a3] hover:text-[#f3efe6] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-4 pr-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-[rgba(47,107,95,0.25)]">
              <Edit2 size={24} className="text-[#d7f1eb]" />
            </div>
            <h2 id="rename-tierlist-title" className="font-display text-xl font-bold text-[#f3efe6]">
              Переименование
            </h2>
          </div>

          <p className="text-[#b8b1a3]">
            Текущее название: <span className="font-medium text-[#f3efe6]">{tierList?.title}</span>
          </p>

          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Новое название"
            className="w-full px-4 py-3 bg-black/35 border border-white/25 rounded-md text-[#f3efe6] placeholder:text-[#b8b1a3] focus:outline-none focus:ring-2 focus:ring-(--accent-main) transition-opacity"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename();
              }
            }}
          />

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={onRename}
              disabled={!title.trim() || isPending}
            >
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Переименование...
                </>
              ) : (
                <>
                  <Edit2 size={16} className="mr-2" />
                  Переименовать
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

RenameTierListModal.displayName = "RenameTierListModal";
