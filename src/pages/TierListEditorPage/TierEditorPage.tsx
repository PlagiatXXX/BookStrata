import "./ExportThemes.css";
import { useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
import { useTierEditorDraft } from "./hooks/useTierEditorDraft";
import { TasteMatchBanner } from "@/components/TasteMatchBanner/TasteMatchBanner";
import "./TierEditorPage.css";
import type { Book, Tier } from "@/types";

type PendingDeletedBook = {
  book: Book;
  containerId: string | null;
  index: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

const DELETE_UNDO_DURATION_MS = 3000;

// Логгер для страницы редактора
const logger = createLogger("TierEditorPage", { color: "green" });

// Внутренний компонент с ключом для автоматического сброса состояния
const TierListEditorContent = () => {
  const { id: tierListId = "" } = useParams<{ id: string }>();
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
    restoreBook,
    addRow,
    updateTierSettings,
    renameTier,
    clearRows,
    removeTier,
    updateBook,
  } = useTierList(initialDataForHook, !hasUnsavedChanges);

  // ========== ОПТИМИЗИРОВАННОЕ АВТОСОХРАНЕНИЕ ==========
  const {
    saveStatus,
    lastSaved,
    handleSave,
  } = useTierEditorSave({
    tierListId,
    listData,
    dispatch: dispatch as React.Dispatch<Action>,
    isLoading,
    isReadOnly,
    setHasUnsavedChanges,
    logger,
  });

  const { checkAndRestoreDraft } = useTierEditorDraft({
    tierListId,
    listData,
    hasUnsavedChanges,
    dispatch: dispatch as React.Dispatch<Action>,
    setHasUnsavedChanges,
    sileo,
  });

  useEffect(() => {
    checkAndRestoreDraft();
  }, [tierListId, checkAndRestoreDraft]);

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl (Windows/Linux) or Meta (Mac) is pressed along with 's'
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        // ALWAYS prevent browser's default "Save Page" dialog/screenshot
        e.preventDefault();

        // Only save if there are changes and we're not already saving/readonly
        if (!isReadOnly && hasUnsavedChanges && saveStatus !== "saving") {
          handleSave();
        } else if (isReadOnly) {
          // User is viewing (read-only mode) - just prevent default
          logger.info("Ctrl+S pressed in read-only mode, prevented default");
        } else if (saveStatus === "saving") {
          // Already saving - just prevent default
          logger.info("Ctrl+S pressed while saving, prevented default");
        } else if (!hasUnsavedChanges) {
          // No unsaved changes - just prevent default
          logger.info("Ctrl+S pressed with no unsaved changes, prevented default");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, isReadOnly, hasUnsavedChanges, saveStatus]);
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

  const pendingDeletedBooksRef = useRef<Map<string, PendingDeletedBook>>(
    new Map(),
  );

  // Обработчики с установкой hasUnsavedChanges
  const handleDragEndWithUnsaved = (event: DragEndEvent) => {
    handleDragEnd(event);
    setHasUnsavedChanges(true);
  };

  const getBookPlacement = (bookId: string) => {
    for (const tierId of listData.tierOrder) {
      const tier = listData.tiers[tierId];
      const index = tier?.bookIds.indexOf(bookId) ?? -1;

      if (index >= 0) {
        return {
          containerId: tierId,
          index,
        };
      }
    }

    const unrankedIndex = listData.unrankedBookIds.indexOf(bookId);
    if (unrankedIndex >= 0) {
      return {
        containerId: null,
        index: unrankedIndex,
      };
    }

    return {
      containerId: null,
      index: listData.unrankedBookIds.length,
    };
  };

  const undoDeleteBook = (bookId: string) => {
    const pendingDeletedBook = pendingDeletedBooksRef.current.get(bookId);
    if (!pendingDeletedBook) return;

    clearTimeout(pendingDeletedBook.timeoutId);
    pendingDeletedBooksRef.current.delete(bookId);
    restoreBook(
      pendingDeletedBook.book,
      pendingDeletedBook.containerId,
      pendingDeletedBook.index,
    );
    setHasUnsavedChanges(true);

    sileo.success({
      title: "Удаление отменено",
      duration: 2500,
    });
  };

  const deleteBookWithUnsaved = (bookId: string) => {
    const book = listData.books[bookId];
    if (!book) return;

    const placement = getBookPlacement(bookId);
    deleteBook(bookId);
    setHasUnsavedChanges(true);

    const timeoutId = setTimeout(() => {
      const pendingDeletedBook = pendingDeletedBooksRef.current.get(bookId);
      if (!pendingDeletedBook) return;

      pendingDeletedBooksRef.current.delete(bookId);
      handleDeleteBook(bookId, {
        showSuccessToast: false,
        onError: () => {
          restoreBook(
            pendingDeletedBook.book,
            pendingDeletedBook.containerId,
            pendingDeletedBook.index,
          );
          setHasUnsavedChanges(true);
        },
      });
    }, DELETE_UNDO_DURATION_MS);

    pendingDeletedBooksRef.current.set(bookId, {
      book,
      containerId: placement.containerId,
      index: placement.index,
      timeoutId,
    });

    sileo.action({
      title: "Книга удалена",
      description: `Удалили "${book.title}"`,
      duration: DELETE_UNDO_DURATION_MS,
      button: {
        title: "Отменить",
        onClick: () => undoDeleteBook(bookId),
      },
    });
  };

  const addRowWithUnsaved = () => {
    addRow();
    setHasUnsavedChanges(true);
  };

  const updateTierSettingsWithUnsaved = (
    tierId: string,
    settings: Partial<Tier>,
  ) => {
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
  const { handleConfirmLeave, handleSaveBeforeLeave, handleCancelLeave } =
    useTierEditorBlocker({
      isReadOnly,
      ignoreUnsavedBlocker,
      hasUnsavedChanges,
      saveStatus,
      isUpdatingBook,
      setShowUnsavedModal,
      setIgnoreUnsavedBlocker,
      setDeletedTierIds,
      setIsSavingBeforeLeave,
      cancel: () => {},
      forceSave: handleSave,
      navigate,
      logger,
      sileo,
    });

  // Получаем D&D логику из хука
  const {
    tierGridRef,
    handleDragStart,
    handleDragOver,
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
    saveStatus,
    lastSaved,
    hasUnsavedChanges,
    onSave: handleSave,
    ...(isReadOnly && {
      author: apiData?.user,
      likesCount: likesData?.likesCount || 0,
      initialLiked: likesData?.isLiked || false,
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
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndAndClear}
        onDragCancel={() => setActiveItem(null)}
        headerProps={headerProps}
        onMyRatingsClick={handleMyRatingsClick}
        isReadOnly={isReadOnly}
      >
        <TasteMatchBanner
          apiData={apiData}
          isReadOnly={isReadOnly}
          authorUsername={apiData?.user?.username}
        />
        <EditorMainContent
          listData={listData}
          isReadOnly={isReadOnly}
          isPro={isPro}
          tierGridRef={tierGridRef}
          onDeleteBook={setBookToDelete}
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
          onUploadBooks={async (files: File[]) => {
            // Преобразуем файлы в книги и добавляем
            for (const file of files) {
              // Конвертируем в base64 data URL — persist после перезагрузки
              const coverImageUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              });
              const bookId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              dispatch({
                type: "ADD_BOOKS",
                payload: {
                  newBooks: [
                    {
                      id: bookId,
                      title: file.name.replace(/\.[^/.]+$/, ""),
                      author: "Неизвестен",
                      coverImageUrl,
                    },
                  ],
                },
              });
              setHasUnsavedChanges(true);
            }
          }}
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
        onConfirmExport={(theme, showWatermark) =>
          onDownloadImage(theme, showWatermark, authUser?.username)
        }
        username={authUser?.username || "user"}
        isPro={isPro}
      />
    </EditorScreens>
  );
};

// Главный компонент с key для сброса состояния при смене tierListId
export const TierListEditorPage = () => {
  const { id: tierListId = "" } = useParams<{ id: string }>();
  return <TierListEditorContent key={tierListId} />;
};
