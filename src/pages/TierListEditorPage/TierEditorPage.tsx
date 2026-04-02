import './ExportThemes.css';
import { type ExportTheme } from './components/ExportModal';
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { sileo } from "sileo";
import type { DragEndEvent } from "@dnd-kit/core";
import { useTierList } from "@/hooks/useTierList";
import type { Action } from "@/hooks/useTierList";
import { useAuth } from "@/hooks/useAuthContext";
import { createLogger } from "@/lib/logger";
import { EditorModals } from "./components/EditorModals";
import { EditorLayout } from "./components/EditorLayout";
import { EditorMainContent } from "./components/EditorMainContent";
import { EditorScreens } from "./components/EditorScreens";
import { useTierEditorActions } from "./hooks/useTierEditorActions";
import { useTierEditorState } from "./hooks/useTierEditorState";
import { useTierEditorQueries } from "./hooks/useTierEditorQueries";
import { useTierEditorDrag } from "./hooks/useTierEditorDrag";
import { useTierEditorBlocker } from "./hooks/useTierEditorBlocker";
import { useTierEditorSave } from "./hooks/useTierEditorSave";
import "./TierEditorPage.css";
import type { Book } from "@/types";

// Логгер для страницы редактора
const logger = createLogger("TierEditorPage", { color: "green" });

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
    isExportModalOpen,
    setIsExportModalOpen,

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

  // Получаем данные и настройки пользователя
  const { user: authUser } = useAuth();

  // Получаем данные через React Query
  const {
    isLoading,
    isError,
    error,
    apiData,
    likesData,
    likedIdsSet,
    isPublic,
    initialDataForHook,
  } = useTierEditorQueries(tierListId);

  // Извлекаем ID владельца и текущего пользователя
  const ownerUserId = apiData?.user?.id;
  const currentUserId = authUser?.userId;
  const isOwner = currentUserId === ownerUserId;

  // Режим просмотра (если не владелец и список публичный)
  const isReadOnly = !isOwner && isPublic;

  // Получаем Pro статус из AuthContext
  const isPro = authUser?.isPro ?? false;

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
  const {
    autoSaveStatus,
    lastSaved,
    forceSave,
    cancel,
    getSavePayload,
    savePayload,
  } = useTierEditorSave({
    tierListId,
    listData,
    dispatch: dispatch as React.Dispatch<Action>,
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

  // Обработчики с установкой hasUnsavedChanges
  const handleDragEndWithUnsaved = (event: DragEndEvent) => {
    handleDragEnd(event);
    setHasUnsavedChanges(true);
  };

  const deleteBookWithUnsaved = (bookId: string) => {
    deleteBook(bookId);
    setHasUnsavedChanges(true);
    handleDeleteBook(bookId);
  };

  const addRowWithUnsaved = () => {
    addRow();
    setHasUnsavedChanges(true);
  };

  const updateTierSettingsWithUnsaved = (tierId: string, settings: any) => {
    updateTierSettings(tierId, settings);
    setHasUnsavedChanges(true);
  };

  const renameTierWithUnsaved = (tierId: string, newTitle: string) => {
    renameTier(tierId, newTitle);
    setHasUnsavedChanges(true);
  };

  const removeTierWithUnsaved = (tierId: string) => {
    removeTier(tierId);
    setHasUnsavedChanges(true);
  };

  const addBooksWithUnsaved = (books: any[]) => {
    addBooks(books);
    setHasUnsavedChanges(true);
  };

  const handleConfirmClearAll = () => {
    clearRows();
    setHasUnsavedChanges(true);
    setIsClearAllModalOpen(false);
  };

  const handleConfirmDeleteRating = async () => {
    await deleteRatingFromServer();
    setShowDeleteRatingModal(false);
  };

  const handleMyRatingsClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      navigate("/");
    }
  };

  const handleViewBook = (book: Book) => {
    setBookToView(book);
  };

  // Логика блокировщика перехода
  const {
    handleConfirmLeave,
    handleSaveBeforeLeave,
    handleCancelLeave,
  } = useTierEditorBlocker({
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
  const {
    tierGridRef,
    handleDragStart,
    handleDragEndAndClear,
    onDownloadImage,
  } = useTierEditorDrag({
    listData,
    setActiveItem,
    handleDragEndWithUnsaved,
  });

  const handleConfirmDelete = () => {
    if (tierToDelete) removeTierWithUnsaved(tierToDelete);
    setTierToDelete(null);
  };

  const handleConfirmDeleteBook = () => {
    if (bookToDelete) deleteBookWithUnsaved(bookToDelete);
    setBookToDelete(null);
  };

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
          onEditBook={(book) => setBookToEdit(book)}
          onViewBook={handleViewBook}
          activeTierId={activeTierId}
          onAddRow={addRowWithUnsaved}
          onChangeTierColor={(tierId, color) =>
            updateTierSettingsWithUnsaved(tierId, { color })
          }
          onRenameTier={renameTierWithUnsaved}
          onDeleteTier={setTierToDelete}
          onSetActiveTier={(id) =>
            setActiveTierId((current) => (current === id ? null : id))
          }
          onUpdateTier={updateTierSettingsWithUnsaved}
          onClearRows={() => setIsClearAllModalOpen(true)}
          onDownloadImage={() => setIsExportModalOpen(true)}
          onMyRatingsClick={handleMyRatingsClick}
          onDeleteRating={() => setShowDeleteRatingModal(true)}
          isPublic={isPublic}
          onTogglePublic={togglePublic}
          isTogglingPublic={isTogglingPublic}
          onFindBook={() => setIsSearchModalOpen(true)}
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
        isExportModalOpen={isExportModalOpen}
        onCloseExport={() => setIsExportModalOpen(false)}
        onConfirmExport={(theme, showWatermark) => onDownloadImage(theme, showWatermark, authUser?.username)}
        username={authUser?.username || 'user'}
        isPro={isPro}
      />
    </EditorScreens>
  );
};

// Главный компонент с key для сброса состояния при смене tierListId
export const TierListEditorPage = () => {
  const { id: tierListId } = useParams<{ id: string }>();
  return <TierListEditorContent key={tierListId} />;
};
