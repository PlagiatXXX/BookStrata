import { EditorConfirmModal } from "./EditorConfirmModal";

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
    <EditorConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Удалить блок?"
      titleId="delete-tier-title"
      confirmLabel="Удалить"
      description={
        <>
          <p>
            {tierTitle ? (
              <>
                Вы уверены, что хотите удалить блок{" "}
                <span className="font-bold text-[#f6f1e8]">"{tierTitle}"</span>?
              </>
            ) : (
              "Вы уверены, что хотите удалить этот блок?"
            )}
          </p>
          <p className="mt-3">
            Все книги из него будут перемещены в блок "Книги без рейтинга".
          </p>
          <p className="mt-3">Это действие нельзя отменить.</p>
        </>
      }
    />
  );
}
