/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';
import {
  DndContext,
  KeyboardSensor,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DashboardLayout } from '@/layouts/DashboardLayout/DashboardLayout';
import { TierGrid } from '@/components/TierGrid/TierGrid';
import { SettingsSidebar } from '@/components/SettingsSidebar/SettingsSidebar';
import { UnrankedItems } from '@/components/UnrankedItems/UnrankedItems';
import { BookCover } from '@/ui/BookCover';
import { EditorLoadingScreen, EditorErrorScreen } from '@/components/EditorScreens';
import { useTierList } from '@/hooks/useTierList';
import type { Action } from '@/hooks/useTierList';
import { useAuth } from '@/hooks/useAuthContext';
import type { Book, Tier, TierListData } from '@/types';
import { getInitialData } from './_initialData';
import {
  fetchTierList,
  transformApiToState,
  saveTierListOptimized,
  type SaveTierListPayload,
} from '@/lib/tierListApi';
import { apiGetTierListLikes, apiGetLikedTierListIds } from '@/lib/likesApi';
import { logger } from '@/lib/logger';
import { useAutoSaveOptimized } from '@/hooks/useAutoSaveOptimized';
import { getPlacementsDiff, getTiersDiff, getNewBooks as getNewBooksUtil } from '@/utils/saveDiff';
import { EditorModals } from './components/EditorModals';
import { EditorHeader } from './components/EditorHeader';
import { useTierEditorActions } from './hooks/useTierEditorActions';
import './TierEditorPage.css';

// Пустой объект для инициализации, пока данные грузятся
const emptyData: TierListData = {
  id: '',
  title: '',
  books: {},
  tiers: {},
  tierOrder: [],
  unrankedBookIds: [],
  isPublic: false,
  tierIdToTempIdMap: {},
};

// Внутренний компонент с ключом для автоматического сброса состояния
const TierListEditorContent = () => {
  const { id: tierListId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Состояние для отслеживания несохраненных изменений
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deletedTierIds, setDeletedTierIds] = useState<number[]>([]);

  // Оригинальные данные для diff
  const originalDataRef = useRef<TierListData | null>(null);

  // Загрузка данных с сервера
  const {
    data: apiData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tierList', tierListId],
    queryFn: () => fetchTierList(tierListId!),
    enabled: !!tierListId,
    staleTime: 0,
  });

  // Сохраняем оригинал после загрузки apiData
  useEffect(() => {
    if (apiData) {
      originalDataRef.current = transformApiToState(apiData);
    }
  }, [apiData]);

  // Получаем количество лайков
  const { data: likesData } = useQuery({
    queryKey: ['tierListLikes', tierListId],
    queryFn: () => (tierListId ? apiGetTierListLikes(parseInt(tierListId)) : null),
    enabled: !!tierListId,
  });

  // Получаем все лайкнутые тир-листы
  const { data: likedTierListIds } = useQuery({
    queryKey: ['likedTierListIds'],
    queryFn: () => apiGetLikedTierListIds(),
    staleTime: 5 * 60 * 1000,
  });

  const likedIdsSet = useMemo(
    () => new Set(likedTierListIds?.likedIds || []),
    [likedTierListIds?.likedIds],
  );

  // Трансформация данных (API -> UI)
  const initialDataForHook = useMemo((): TierListData => {
    if (apiData) {
      const data = transformApiToState(apiData);
      if (Object.keys(data.tiers).length === 0) {
        return getInitialData(tierListId!, apiData.title || 'Новый тир-лист');
      }
      return data;
    } else if (isError) {
      return getInitialData(tierListId!, 'Новый тир-лист');
    }
    return emptyData;
  }, [apiData, isError, tierListId]);

  // Получаем isPublic из API данных
  const isPublic = apiData?.isPublic ?? false;

  // Проверяем владельца
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.userId;
  const ownerUserId = apiData?.user?.id;
  const isOwner = currentUserId === ownerUserId;
  const isReadOnly = !isOwner && isPublic;

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
  const getSavePayload = useCallback((): SaveTierListPayload => {
    if (!listData.id) return {};

    const placements = getPlacementsDiff(listData);
    const tiers = getTiersDiff(listData);
    const newBooks = getNewBooksUtil(listData);

    return {
      placements: placements.length > 0 ? placements : undefined,
      tiers: (tiers.added.length > 0 || tiers.updated.length > 0) ? tiers : undefined,
      newBooks: newBooks.length > 0 ? newBooks : undefined,
    };
  }, [listData]);

  const savePayload = useCallback(async (payload: SaveTierListPayload) => {
    if (!tierListId) return;
    
    const result = await saveTierListOptimized(tierListId, payload, listData);
    setHasUnsavedChanges(false);

    // Если были созданы новые книги, заменяем временные ID на реальные
    if (result?.bookReplacements && result.bookReplacements.length > 0) {
      dispatch({ type: 'REPLACE_BOOK_IDS', payload: result.bookReplacements });
    }

    // Инвалидируем кэш чтобы загрузить актуальные данные
    queryClient.invalidateQueries({ queryKey: ['tierList', tierListId] });

    logger.info('Сохранение успешно', { tierListId });
  }, [tierListId, queryClient, dispatch, listData]);

  const { status: autoSaveStatus, lastSaved, forceSave, cancel } = useAutoSaveOptimized({
    listId: tierListId || null,
    getSavePayload,
    saveFunction: savePayload,
    delay: 3000, // 3 секунды
    enabled: !isLoading && !!listData.id && !isReadOnly,
    skipNewBooks: false, // Сохраняем и новые книги тоже!
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

  const addBooksWithUnsaved = async (files: File[]) => {
    await addBooks(files);
    setHasUnsavedChanges(true);
  };

  const deleteBookWithUnsaved = (bookId: string) => {
    setBookToDelete(bookId);
  };

  const addRowWithUnsaved = (title?: string) => {
    addRow(title);
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

  const clearRowsWithUnsaved = () => {
    clearRows();
    setHasUnsavedChanges(true);
  };

  const removeTierWithUnsaved = (tierId: string) => {
    if (!tierId.startsWith('tier-')) {
      const numericId = parseInt(tierId, 10);
      if (!isNaN(numericId)) {
        setDeletedTierIds((prev) => [...prev, numericId]);
      }
    }
    removeTier(tierId);
    setHasUnsavedChanges(true);
  };

  const handleConfirmDeleteRating = () => {
    setShowDeleteRatingModal(false);
    setIgnoreUnsavedBlocker(true);
    setDeletedTierIds([]);
    deleteRatingFromServer();
  };

  // Предупреждение при закрытии вкладки
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || isUpdatingBook) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите обновить страницу?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isUpdatingBook]);

  // Состояния модальных окон
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteRatingModal, setShowDeleteRatingModal] = useState(false);
  const [ignoreUnsavedBlocker, setIgnoreUnsavedBlocker] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);

  const blocker = useBlocker(
    !isReadOnly &&
      !ignoreUnsavedBlocker &&
      (hasUnsavedChanges || autoSaveStatus === 'saving' || isUpdatingBook),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true);
    }
  }, [blocker.state]);

  const handleMyRatingsClick = () => {
    setDeletedTierIds([]);
    navigate('/');
  };

  // Принудительное сохранение перед выходом
  const handleSaveBeforeLeave = async () => {
    setIsSavingBeforeLeave(true);
    try {
      // Отменяем текущее автосохранение если оно есть
      cancel();
      
      // Принудительно сохраняем всё сразу
      await forceSave();
      
      // Ждём немного чтобы убедиться что сохранение завершилось
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowUnsavedModal(false);
      setIgnoreUnsavedBlocker(true);
      blocker.proceed?.();
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), { action: 'saveBeforeLeave' });
      sileo.error({ 
        title: 'Не удалось сохранить', 
        description: 'Попробуйте выйти без сохранения',
        duration: 3000 
      });
    } finally {
      setIsSavingBeforeLeave(false);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    setIgnoreUnsavedBlocker(true);
    blocker.proceed?.();
  };

  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
    setDeletedTierIds([]);
    blocker.reset?.();
  };

  // D&D состояния
  const [activeItem, setActiveItem] = useState<Book | Tier | null>(null);
  const [tierToDelete, setTierToDelete] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [activeTierId, setActiveTierId] = useState<string | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [bookToView, setBookToView] = useState<Book | null>(null);
  const tierGridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === 'book') setActiveItem(listData.books[active.id] || null);
    else if (type === 'tier') setActiveItem(listData.tiers[active.id] || null);
  };

  const handleDragEndAndClear = (event: DragEndEvent) => {
    handleDragEndWithUnsaved(event);
    setActiveItem(null);
  };

  const onDownloadImage = useCallback(async () => {
    if (tierGridRef.current === null) return;
    logger.info('Downloading tier list as image', { title: listData.title });
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(tierGridRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `${listData.title.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      logger.info('Tier list image downloaded successfully', {
        title: listData.title,
      });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'downloadImage',
        title: listData.title,
      });
    }
  }, [tierGridRef, listData.title]);

  const handleConfirmDelete = () => {
    if (tierToDelete) removeTierWithUnsaved(tierToDelete);
    setTierToDelete(null);
  };

  const handleConfirmDeleteBook = () => {
    if (bookToDelete) {
      deleteBook(bookToDelete);
      handleDeleteBook(bookToDelete);
      setHasUnsavedChanges(true);
    }
    setBookToDelete(null);
  };

  const handleConfirmClearAll = () => {
    clearRowsWithUnsaved();
    setIsClearAllModalOpen(false);
  };

  const handleViewBook = (book: Book) => {
    setBookToView(book);
  };

  // Рендеринг
  if (isLoading) {
    return <EditorLoadingScreen onMyRatingsClick={handleMyRatingsClick} />;
  }

  if (isError) {
    return <EditorErrorScreen error={error} onMyRatingsClick={handleMyRatingsClick} />;
  }

  const unrankedBooks = listData.unrankedBookIds
    .map((id) => listData.books[id])
    .filter(Boolean);
  const activeTierData = activeTierId ? listData.tiers[activeTierId] : null;

  return (
    <>
      {!isReadOnly && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndAndClear}
          onDragCancel={() => setActiveItem(null)}
        >
          <DashboardLayout
            onMyRatingsClick={handleMyRatingsClick}
            onSearch={() => {}}
            searchValue=""
            showSearch={false}
          >
            <main className="tier-editor-y2k flex-1 overflow-y-auto p-4 text-[#d8f9ff] lg:p-8">
              <EditorHeader
                title={listData.title}
                autoSaveStatus={autoSaveStatus}
                lastSaved={lastSaved}
                onSaveRetry={() => savePayload(getSavePayload())}
              />

              <div className="flex flex-col gap-6 lg:flex-row lg:justify-center">
                <div className="flex max-w-350 flex-1 flex-col gap-4">
                  <TierGrid
                    ref={tierGridRef}
                    listData={listData}
                    onDeleteBook={isReadOnly ? undefined : deleteBookWithUnsaved}
                    onEditBook={isReadOnly ? undefined : (book) => setBookToEdit(book)}
                    onViewBook={handleViewBook}
                    activeTierId={activeTierId}
                    onAddRow={isReadOnly ? undefined : addRowWithUnsaved}
                    onChangeTierColor={
                      isReadOnly
                        ? undefined
                        : (tierId, color) =>
                            updateTierSettingsWithUnsaved(tierId, { color })
                    }
                    onRenameTier={isReadOnly ? undefined : renameTierWithUnsaved}
                    onDeleteTier={isReadOnly ? undefined : setTierToDelete}
                    onSetActiveTier={(id) =>
                      setActiveTierId((current) => (current === id ? null : id))
                    }
                  />

                  <UnrankedItems
                    books={unrankedBooks}
                    onUpload={isReadOnly ? undefined : addBooksWithUnsaved}
                    onDeleteBook={isReadOnly ? undefined : deleteBookWithUnsaved}
                    onEditBook={isReadOnly ? undefined : (book) => setBookToEdit(book)}
                    onViewBook={handleViewBook}
                  />
                </div>

                {!isReadOnly && (
                  <div className="shrink-0 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
                    <SettingsSidebar
                      key={activeTierData?.id}
                      activeTier={activeTierData || undefined}
                      onUpdateTier={
                        isReadOnly ? undefined : updateTierSettingsWithUnsaved
                      }
                      onAddRow={isReadOnly ? undefined : addRowWithUnsaved}
                      onClearRows={
                        isReadOnly ? undefined : () => setIsClearAllModalOpen(true)
                      }
                      onDownloadImage={onDownloadImage}
                      onMyRatingsClick={handleMyRatingsClick}
                      onDeleteRating={
                        isReadOnly ? undefined : () => setShowDeleteRatingModal(true)
                      }
                      isPublic={isPublic}
                      onTogglePublic={isReadOnly ? undefined : togglePublic}
                      isTogglingPublic={isTogglingPublic}
                      onFindBook={
                        isReadOnly ? undefined : () => setIsSearchModalOpen(true)
                      }
                    />
                  </div>
                )}
              </div>
            </main>
          </DashboardLayout>

          <DragOverlay dropAnimation={null}>
            {activeItem && 'coverImageUrl' in activeItem ? (
              <BookCover book={activeItem as Book} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Режим просмотра */}
      {isReadOnly && (
        <DashboardLayout
          onMyRatingsClick={handleMyRatingsClick}
          onSearch={() => {}}
          searchValue=""
          showSearch={false}
        >
          <main className="tier-editor-y2k flex-1 overflow-y-auto p-4 text-[#d8f9ff] lg:p-8">
            <EditorHeader
              title={listData.title}
              author={apiData?.user}
              likesCount={likesData?.likesCount || 0}
              likedIdsSet={likedIdsSet}
              tierListId={tierListId!}
              ownerUserId={ownerUserId}
              currentUserId={currentUserId}
              autoSaveStatus={autoSaveStatus}
              lastSaved={lastSaved}
              onSaveRetry={() => savePayload(getSavePayload())}
              isReadOnly={isReadOnly}
            />

            <TierGrid
              ref={tierGridRef}
              listData={listData}
              onViewBook={handleViewBook}
              activeTierId={null}
            />
          </main>
        </DashboardLayout>
      )}

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
    </>
  );
};

// Главный компонент с key для сброса состояния при смене tierListId
export const TierListEditorPage = () => {
  const { id: tierListId } = useParams<{ id: string }>();
  return <TierListEditorContent key={tierListId} />;
};
