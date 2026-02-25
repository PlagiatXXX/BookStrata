import { lazy, Suspense } from 'react';
import type { Book, TierListData } from '@/types';
import {
  DeleteTierModal,
  DeleteBookModal,
  ClearAllModal,
  UnsavedChangesModal,
  DeleteRatingModal,
} from '@/components/EditorModals';
import { BookEditModal } from '@/components/BookEditModal/BookEditModal';
import { BookViewModal } from '@/components/BookViewModal/BookViewModal';
import { Spinner } from '@/components/Spinner';

// Ленивый импорт модального окна поиска книг
const BookSearchModal = lazy(() =>
  import('@/components/BookSearchModal/BookSearchModal').then(module => ({
    default: module.BookSearchModal,
  }))
);

// Компонент загрузки для SearchModal
function BookSearchModalLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" />
      <div className="y2k-panel relative flex items-center justify-center rounded-[14px] p-8">
        <Spinner size="lg" />
      </div>
    </div>
  );
}

interface EditorModalsProps {
  // Состояния модальных окон
  tierToDelete: string | null;
  bookToDelete: string | null;
  isClearAllModalOpen: boolean;
  showUnsavedModal: boolean;
  showDeleteRatingModal: boolean;
  bookToEdit: Book | null;
  bookToView: Book | null;
  isSearchModalOpen: boolean;
  tierListId: string | undefined;
  
  // Данные для отображения
  listData: TierListData;
  
  // Обработчики
  onCloseDeleteTier: () => void;
  onCloseDeleteBook: () => void;
  onCloseClearAll: () => void;
  onCloseUnsaved: () => void;
  onCloseDeleteRating: () => void;
  onCloseEditBook: () => void;
  onCloseViewBook: () => void;
  onCloseSearch: () => void;
  onConfirmDeleteTier: () => void;
  onConfirmDeleteBook: () => void;
  onConfirmClearAll: () => void;
  onConfirmDeleteRating: () => void;
  onConfirmLeave: () => void;
  onSaveAndLeave: () => void;
  onSaveBook: (bookId: string, data: { title?: string; author?: string; description?: string; thoughts?: string }) => void;
  onBookAdded: (book: {
    id: number;
    title: string;
    author: string | null;
    coverImageUrl: string;
  } | null) => void;
  isUpdatingBook: boolean;
  isSavingBeforeLeave: boolean;
}

export const EditorModals = ({
  tierToDelete,
  bookToDelete,
  isClearAllModalOpen,
  showUnsavedModal,
  showDeleteRatingModal,
  bookToEdit,
  bookToView,
  isSearchModalOpen,
  tierListId,
  listData,
  onCloseDeleteTier,
  onCloseDeleteBook,
  onCloseClearAll,
  onCloseUnsaved,
  onCloseDeleteRating,
  onCloseEditBook,
  onCloseViewBook,
  onCloseSearch,
  onConfirmDeleteTier,
  onConfirmDeleteBook,
  onConfirmClearAll,
  onConfirmDeleteRating,
  onConfirmLeave,
  onSaveAndLeave,
  onSaveBook,
  onBookAdded,
  isUpdatingBook,
  isSavingBeforeLeave,
}: EditorModalsProps) => {
  return (
    <>
      <DeleteTierModal
        isOpen={!!tierToDelete}
        onClose={onCloseDeleteTier}
        onConfirm={onConfirmDeleteTier}
        tierTitle={tierToDelete ? listData.tiers[tierToDelete]?.title : undefined}
      />

      <DeleteBookModal
        isOpen={!!bookToDelete}
        onClose={onCloseDeleteBook}
        onConfirm={onConfirmDeleteBook}
        bookTitle={bookToDelete ? listData.books[bookToDelete]?.title : undefined}
      />

      <ClearAllModal
        isOpen={isClearAllModalOpen}
        onClose={onCloseClearAll}
        onConfirm={onConfirmClearAll}
      />

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onClose={onCloseUnsaved}
        onConfirm={onConfirmLeave}
        onSaveAndLeave={onSaveAndLeave}
        isUpdatingBook={isUpdatingBook}
        isSaving={isSavingBeforeLeave}
      />

      <DeleteRatingModal
        isOpen={showDeleteRatingModal}
        onClose={onCloseDeleteRating}
        onConfirm={onConfirmDeleteRating}
      />

      <BookEditModal
        isOpen={!!bookToEdit}
        onClose={onCloseEditBook}
        book={bookToEdit}
        onSave={onSaveBook}
      />

      <BookViewModal
        isOpen={!!bookToView}
        onClose={onCloseViewBook}
        book={bookToView}
      />

      <Suspense fallback={<BookSearchModalLoader />}>
        <BookSearchModal
          isOpen={isSearchModalOpen}
          onClose={onCloseSearch}
          tierListId={tierListId!}
          onBookAdded={onBookAdded}
        />
      </Suspense>
    </>
  );
};
