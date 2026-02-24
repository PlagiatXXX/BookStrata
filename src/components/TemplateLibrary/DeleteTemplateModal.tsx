import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";

interface DeleteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  templateTitle: string;
  isDeleting: boolean;
}

export const DeleteTemplateModal = ({
  isOpen,
  onClose,
  onConfirm,
  templateTitle,
  isDeleting,
}: DeleteTemplateModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-4 mt-2">
          <div className="p-3 rounded-full bg-red-500/20">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          Удалить шаблон?
        </h3>
        
        <p className="text-gray-400 dark:text-gray-400 light:text-gray-600 mb-6">
          Вы уверены, что хотите удалить шаблон <br />
          <span className="text-cyan-400 font-medium">"{templateTitle}"</span>?
          <br />
          Это действие нельзя отменить.
        </p>
        
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
