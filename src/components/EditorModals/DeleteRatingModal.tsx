import { EditorConfirmModal } from "./EditorConfirmModal";

interface DeleteRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteRatingModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteRatingModalProps) {
  return (
    <EditorConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Удалить рейтинг?"
      titleId="delete-rating-title"
      confirmLabel="Удалить"
      isProcessing={isDeleting}
      processingLabel="Удаление..."
      description={
        <>
          <p>Вы уверены, что хотите удалить этот рейтинг?</p>
          <p className="mt-3">Это действие нельзя отменить.</p>
        </>
      }
    />
  );
}
