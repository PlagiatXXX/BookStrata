import { EditorConfirmModal } from "./EditorConfirmModal";

interface DeleteBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle?: string;
}

export function DeleteBookModal({
  isOpen,
  onClose,
  onConfirm,
  bookTitle,
}: DeleteBookModalProps) {
  return (
    <EditorConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Удалить книгу?"
      titleId="delete-book-title"
      confirmLabel="Удалить"
      description={
        <>
          <p>
            {bookTitle ? (
              <>
                Вы уверены, что хотите удалить книгу{" "}
                <span className="font-bold text-[#f6f1e8]">"{bookTitle}"</span>?
              </>
            ) : (
              "Вы уверены, что хотите удалить эту книгу?"
            )}
          </p>
          <p className="mt-3">Это действие нельзя отменить.</p>
        </>
      }
    />
  );
}
