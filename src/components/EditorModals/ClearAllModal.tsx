import { EditorConfirmModal } from "./EditorConfirmModal";

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClearAllModal({
  isOpen,
  onClose,
  onConfirm,
}: ClearAllModalProps) {
  return (
    <EditorConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Очистить все блоки?"
      titleId="clear-all-title"
      confirmLabel="Очистить"
      description={
        <>
          <p>
            Все книги из блоков будут перемещены в блок "Книги без рейтинга".
          </p>
          <p className="mt-3">Это действие нельзя отменить.</p>
        </>
      }
    />
  );
}
