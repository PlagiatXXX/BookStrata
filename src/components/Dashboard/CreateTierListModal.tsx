import { memo } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import { Spinner } from "@/components/Spinner";

interface CreateTierListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  onCreate: () => void;
  isPending: boolean;
}

export const CreateTierListModal = memo(({
  isOpen,
  onClose,
  title,
  onTitleChange,
  onCreate,
  isPending,
}: CreateTierListModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="create-tierlist-title">
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
            <div className="p-2 rounded-full bg-[rgba(217,79,43,0.2)]">
              <Plus size={24} className="text-[#f3efe6]" />
            </div>
            <h2 id="create-tierlist-title" className="font-display text-xl font-bold text-[#f3efe6]">
              Создание тир-листа
            </h2>
          </div>

          <p className="text-[#b8b1a3]">
            Придумайте название для вашего нового рейтинга книг
          </p>

          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Например: Лучшие фэнтези книги 2024"
            className="w-full px-4 py-3 bg-black/35 border border-white/25 rounded-md text-[#f3efe6] placeholder:text-[#b8b1a3] focus:outline-none focus:ring-2 focus:ring-(--accent-main) transition-opacity"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onCreate();
              }
            }}
            autoFocus
          />

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={onCreate}
              disabled={!title.trim() || isPending}
            >
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Создание...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Создать
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

CreateTierListModal.displayName = "CreateTierListModal";
