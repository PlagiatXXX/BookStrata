import { useParams, useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import { useCallback } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useTierList } from '@/hooks/useTierList';
import type { Action } from '@/hooks/useTierList';
import { useAuth } from '@/hooks/useAuthContext';
import { createLogger } from '@/lib/logger';
import { EditorModals } from './components/EditorModals';
import { EditorLayout } from './components/EditorLayout';
import { EditorMainContent } from './components/EditorMainContent';
import { EditorScreens } from './components/EditorScreens';
import { useTierEditorActions } from './hooks/useTierEditorActions';
import { useTierEditorState } from './hooks/useTierEditorState';
import { useTierEditorQueries } from './hooks/useTierEditorQueries';
import { useTierEditorDrag } from './hooks/useTierEditorDrag';
import { useTierEditorBlocker } from './hooks/useTierEditorBlocker';
import { useTierEditorSave } from './hooks/useTierEditorSave';
import './TierEditorPage.css';
import type { Book } from '@/types';

// Логгер для страницы редактора
const logger = createLogger('TierEditorPage', { color: 'green' });

// Внутренний компонент с ключом для автоматического сброса состояния
const TierListEditorContent = () => {
  const { id: tierListId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Получаем все состояния из хука
  const {
    // Состояния для отслеживания несохраненных изменений
    hasUnsavedChanges,
    setHasUnsavedChanges,
    deletedTierIds,
    setDeletedTierIds,

    // Состояния модальных окон
    showUnsavedModal,
    setShowUnsavedModal,
    showDeleteRatingModal,
    setShowDeleteRatingModal,
    ignoreUnsavedBlocker,
    setIgnoreUnsavedBlocker,
    isSearchModalOpen,
    setIsSearchModalOpen,
    isSavingBeforeLeave,
    setIsSavingBeforeLeave,

    // D&D состояния
    activeItem,
    setActiveItem,
    tierToDelete,
    setTierToDelete,
    bookToDelete,
    setBookToDelete,
    activeTierId,
    setActiveTierId,
    isClearAllModalOpen,
    setIsClearAllModalOpen,
    bookToEdit,
    setBookToEdit,
    bookToView,
    setBookToView,
  } = useTierEditorState();

  // Получаем данные из query хука
  const {
    apiData,
    isLoading,
    isError,
    error,
    likesData,
    likedIdsSet,
    initialDataForHook,
    isPublic,
  } = useTierEditorQueries(tierListId);

  // Проверяем владельца
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.userId;
  const ownerUserId = apiData?.user?.id;
  const isOwner = currentUserId === ownerUserId;
  const isReadOnly = !isOwner && isPublic;
  
  // TODO: Добавить проверку Pro-подписки из AuthContext или API
  const isPro = false;

  // Получаем функции из хука useTierList
  const {
    listData,
    dispatch,
    handleDragEnd,
    deleteBook,
    addRow,
    updateTierSettings,
    renameTier,
    addBooks,
    clearRows,
    removeTier,
    updateBook,
  } = useTierList(initialDataForHook, !hasUnsavedChanges);

  // ========== ОПТИМИЗИРОВАННОЕ АВТОСОХРАНЕНИЕ ==========
  const { autoSaveStatus, lastSaved, forceSave, cancel, getSavePayload, savePayload } =
    useTierEditorSave({
      tierListId,
      listData,
      dispatch,
      isLoading,
      isReadOnly,
      setHasUnsavedChanges,
      logger,
    });
  // ========== КОНЕЦ АВТОСОХРАНЕНИЯ ==========

  // Получаем функции из хука действий
  const {
    togglePublic,
    isTogglingPublic,
    isUpdatingBook,
    handleSaveBook,
    handleDeleteBook,
    handleBookAdded,
    deleteRatingFromServer,
  } = useTierEditorActions({
    tierListId,
    dispatch: dispatch as React.Dispatch<Action>,
    updateBook,
    deletedTierIds,
    setHasUnsavedChanges,
    setDeletedTierIds,
    navigate,
  });

  // Обработчики с установкой hasUnsavedChanges - Мемоизируем для предотвращения ререндеров EditorMainContent
  const handleDragEndWithUnsaved = useCallback((event: DragEndEvent) => {
    handleDragEnd(event);
    setHasUnsavedChanges(true);
  }, [handleDragEnd, setHasUnsavedChanges]);

  const addBooksWithUnsaved = useCallback(async (files: File[]) => {
    await addBooks(files);
    setHasUnsavedChanges(true);
  }, [addBooks, setHasUnsavedChanges]);

  const deleteBookWithUnsaved = useCallback((bookId: string) => {
    setBookToDelete(bookId);
  }, [setBookToDelete]);

  const addRowWithUnsaved = useCallback((title?: string) => {
    addRow(title);
    setHasUnsavedChanges(true);
  }, [addRow, setHasUnsavedChanges]);

  const updateTierSettingsWithUnsaved = useCallback((
    tierId: string,
    settings: Partial<{ title: string; color: string }>,
  ) => {
    updateTierSettings(tierId, settings);
    setHasUnsavedChanges(true);
  }, [updateTierSettings, setHasUnsavedChanges]);

  const renameTierWithUnsaved = useCallback((tierId: string, newTitle: string) => {
    renameTier(tierId, newTitle);
    setHasUnsavedChanges(true);
  }, [renameTier, setHasUnsavedChanges]);

  const clearRowsWithUnsaved = useCallback(() => {
    clearRows();
    setHasUnsavedChanges(true);
  }, [clearRows, setHasUnsavedChanges]);

  const removeTierWithUnsaved = useCallback((tierId: string) => {
    if (!tierId.startsWith('tier-')) {
      const numericId = parseInt(tierId, 10);
      if (!isNaN(numericId)) {
        setDeletedTierIds((prev) => [...prev, numericId]);
      }
    }
    removeTier(tierId);
    setHasUnsavedChanges(true);
  }, [removeTier, setHasUnsavedChanges, setDeletedTierIds]);

  const handleConfirmDeleteRating = useCallback(() => {
    setShowDeleteRatingModal(false);
    setIgnoreUnsavedBlocker(true);
    setDeletedTierIds([]);
    deleteRatingFromServer();
  }, [deleteRatingFromServer, setDeletedTierIds, setIgnoreUnsavedBlocker, setShowDeleteRatingModal]);

  // Получаем логику блокировок из хука
  const { handleMyRatingsClick, handleSaveBeforeLeave, handleConfirmLeave, handleCancelLeave } =
    useTierEditorBlocker({
      isReadOnly,
      ignoreUnsavedBlocker,
      hasUnsavedChanges,
      autoSaveStatus,
      isUpdatingBook,
      setShowUnsavedModal,
      setIgnoreUnsavedBlocker,
      setDeletedTierIds,
      setIsSavingBeforeLeave,
      cancel,
      forceSave,
      navigate,
      logger,
      sileo,
    });

  // Получаем D&D логику из хука
  const { tierGridRef, handleDragStart, handleDragEndAndClear, onDownloadImage } =
    useTierEditorDrag({
      listData,
      setActiveItem,
      handleDragEndWithUnsaved,
    });

  const handleConfirmDelete = useCallback(() => {
    if (tierToDelete) removeTierWithUnsaved(tierToDelete);
    setTierToDelete(null);
  }, [tierToDelete, removeTierWithUnsaved, setTierToDelete]);

  const handleConfirmDeleteBook = useCallback(() => {
    if (bookToDelete) {
      deleteBook(bookToDelete);
      handleDeleteBook(bookToDelete);
      setHasUnsavedChanges(true);
    }
    setBookToDelete(null);
  }, [bookToDelete, deleteBook, handleDeleteBook, setHasUnsavedChanges, setBookToDelete]);

  const handleConfirmClearAll = useCallback(() => {
    clearRowsWithUnsaved();
    setIsClearAllModalOpen(false);
  }, [clearRowsWithUnsaved, setIsClearAllModalOpen]);

  const handleViewBook = useCallback((book: Book) => {
    setBookToView(book);
  }, [setBookToView]);

  const handleEditBook = useCallback((book: Book) => {
    setBookToEdit(book);
  }, [setBookToEdit]);

  const handleSetActiveTier = useCallback((id: string | null) => {
    setActiveTierId((current) => (current === id ? null : id));
  }, [setActiveTierId]);

  const handleOpenClearAllModal = useCallback(() => {
    setIsClearAllModalOpen(true);
  }, [setIsClearAllModalOpen]);

  const handleOpenDeleteRatingModal = useCallback(() => {
    setShowDeleteRatingModal(true);
  }, [setShowDeleteRatingModal]);

  const handleOpenSearchModal = useCallback(() => {
    setIsSearchModalOpen(true);
  }, [setIsSearchModalOpen]);

  // Пропсы для EditorHeader
  const headerProps = {
    title: listData.title,
    autoSaveStatus,
    lastSaved,
    onSaveRetry: () => savePayload(getSavePayload()),
    ...(isReadOnly && {
      author: apiData?.user,
      likesCount: likesData?.likesCount || 0,
      likedIdsSet,
      tierListId,
      ownerUserId,
      currentUserId,
      isReadOnly: true,
    }),
  };

  return (
    <EditorScreens
      isLoading={isLoading}
      isError={isError}
      error={error}
      onMyRatingsClick={handleMyRatingsClick}
    >
      <EditorLayout
        activeItem={activeItem}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndAndClear}
        onDragCancel={() => setActiveItem(null)}
        headerProps={headerProps}
        onMyRatingsClick={handleMyRatingsClick}
        isReadOnly={isReadOnly}
      >
        <EditorMainContent
          listData={listData}
          isReadOnly={isReadOnly}
          isPro={isPro}
          tierGridRef={tierGridRef}
          onDeleteBook={deleteBookWithUnsaved}
          onEditBook={isReadOnly ? undefined : handleEditBook}
          onViewBook={handleViewBook}
          activeTierId={activeTierId}
          onAddRow={addRowWithUnsaved}
          onChangeTierColor={updateTierSettingsWithUnsaved}
          onRenameTier={renameTierWithUnsaved}
          onDeleteTier={setTierToDelete}
          onSetActiveTier={handleSetActiveTier}
          onUpdateTier={updateTierSettingsWithUnsaved}
          onClearRows={handleOpenClearAllModal}
          onDownloadImage={onDownloadImage}
          onMyRatingsClick={handleMyRatingsClick}
          onDeleteRating={handleOpenDeleteRatingModal}
          isPublic={isPublic}
          onTogglePublic={togglePublic}
          isTogglingPublic={isTogglingPublic}
          onFindBook={handleOpenSearchModal}
          onUploadBooks={addBooksWithUnsaved}
        />
      </EditorLayout>

      {/* Модальные окна */}
      <EditorModals
        tierToDelete={tierToDelete}
        bookToDelete={bookToDelete}
        isClearAllModalOpen={isClearAllModalOpen}
        showUnsavedModal={showUnsavedModal}
        showDeleteRatingModal={showDeleteRatingModal}
        bookToEdit={bookToEdit}
        bookToView={bookToView}
        isSearchModalOpen={isSearchModalOpen}
        tierListId={tierListId}
        listData={listData}
        onCloseDeleteTier={() => setTierToDelete(null)}
        onCloseDeleteBook={() => setBookToDelete(null)}
        onCloseClearAll={() => setIsClearAllModalOpen(false)}
        onCloseUnsaved={handleCancelLeave}
        onCloseDeleteRating={() => setShowDeleteRatingModal(false)}
        onCloseEditBook={() => setBookToEdit(null)}
        onCloseViewBook={() => setBookToView(null)}
        onCloseSearch={() => setIsSearchModalOpen(false)}
        onConfirmDeleteTier={handleConfirmDelete}
        onConfirmDeleteBook={handleConfirmDeleteBook}
        onConfirmClearAll={handleConfirmClearAll}
        onConfirmDeleteRating={handleConfirmDeleteRating}
        onConfirmLeave={handleConfirmLeave}
        onSaveAndLeave={handleSaveBeforeLeave}
        onSaveBook={handleSaveBook}
        onBookAdded={handleBookAdded}
        isUpdatingBook={isUpdatingBook}
        isSavingBeforeLeave={isSavingBeforeLeave}
      />
    </EditorScreens>
  );
};

// Главный компонент с key для сброса состояния при смене tierListId
export const TierListEditorPage = () => {
  const { id: tierListId } = useParams<{ id: string }>();
  return <TierListEditorContent key={tierListId} />;
};
