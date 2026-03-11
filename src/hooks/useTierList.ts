import { useReducer, useEffect, useRef } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { TierListData, Tier, Book } from '@/types';
import { UNRANKED_AREA_ID } from '@/constants/dnd';
import { createLogger } from '@/lib/logger';

// Логгер для хука useTierList
const tierListHookLogger = createLogger('UseTierList', { color: 'purple' });

export type Action =
| { type: 'SET_STATE'; payload: TierListData }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'ADD_ROW'; payload: { id: string; title: string; color: string } }
  | { type: 'REMOVE_ROW'; payload: string }
  | {
      type: 'REORDER_ITEMS';
      payload: {
        sourceContainer: string;
        destContainer: string;
        sourceIndex: number;
        destIndex: number;
      };
    }
  | { type: 'REORDER_TIERS'; payload: { activeId: string; overId: string } }
  | { type: 'CLEAR_ROWS' }
  | { type: 'UPDATE_TIER_SETTINGS'; payload: { tierId: string; settings: Partial<Omit<Tier, 'id' | 'bookIds'>> } }
  | { type: 'ADD_BOOKS'; payload: { newBooks: Book[] } }
  | { type: 'DELETE_BOOK'; payload: { bookId: string } }
  | { type: 'UPDATE_BOOK'; payload: { bookId: string; updates: Partial<Book> } }
  | { type: 'REPLACE_BOOK_IDS'; payload: { tempId: string; realId: string }[] }
  | { type: 'REPLACE_TIER_IDS'; payload: { tempId: string; realId: string }[] }
  

const tierListReducer = (state: TierListData, action: Action): TierListData => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'ADD_ROW':
      { const newTier: Tier = {
        id: action.payload.id,
        title: action.payload.title,
        color: action.payload.color,
        bookIds: [],
        height: 140,
        labelSize: 'md',
      };
      return {
        ...state,
        tiers: { ...state.tiers, [newTier.id]: newTier },
        tierOrder: [...state.tierOrder, newTier.id],
      };
     }

    case 'SET_TITLE':
      return { ...state, title: action.payload };


     case 'REMOVE_ROW': {
      const tierIdToRemove = action.payload;
      const tierToRemove = state.tiers[tierIdToRemove];
      if (!tierToRemove) return state;
      const booksToUnrank = tierToRemove.bookIds;
      const newUnrankedBookIds = Array.from(new Set([...state.unrankedBookIds, ...booksToUnrank]));
      const newTiers = { ...state.tiers };
      delete newTiers[tierIdToRemove];

      const newTierOrder = state.tierOrder.filter(id => id !== tierIdToRemove);
      return {
        ...state,
        tiers: newTiers,
        tierOrder: newTierOrder,
        unrankedBookIds: newUnrankedBookIds,
      };
    }

    case 'REORDER_ITEMS': {
  const { sourceContainer, destContainer, sourceIndex, destIndex } = action.payload;

  // --- Сценарий 1: Перемещение внутри ОДНОГО контейнера ---
  if (sourceContainer === destContainer) {
    if (sourceContainer === UNRANKED_AREA_ID) {
      const newUnrankedBookIds = arrayMove(state.unrankedBookIds, sourceIndex, destIndex);
      return { ...state, unrankedBookIds: newUnrankedBookIds };
    }
    const tier = state.tiers[sourceContainer];
    const newBookIds = arrayMove(tier.bookIds, sourceIndex, destIndex);
    return {
      ...state,
      tiers: {
        ...state.tiers,
        [sourceContainer]: { ...tier, bookIds: newBookIds },
      },
    };
  }

  // --- Сценарий 2: Перемещение между РАЗНЫМИ контейнерами ---
  const sourceIsUnranked = sourceContainer === UNRANKED_AREA_ID;
  const destIsUnranked = destContainer === UNRANKED_AREA_ID;
  const newTiers = { ...state.tiers };
  const newUnrankedBookIds = [...state.unrankedBookIds];
  let movedItem;
  if (sourceIsUnranked) {
    [movedItem] = newUnrankedBookIds.splice(sourceIndex, 1);
  } else {
    const sourceTierBookIds = [...newTiers[sourceContainer].bookIds];
    [movedItem] = sourceTierBookIds.splice(sourceIndex, 1);
    newTiers[sourceContainer] = { ...newTiers[sourceContainer], bookIds: sourceTierBookIds };
  }
  if (!movedItem) return state;
  if (destIsUnranked) {
    newUnrankedBookIds.splice(destIndex, 0, movedItem);
  } else {
    const destTierBookIds = [...newTiers[destContainer].bookIds];
    destTierBookIds.splice(destIndex, 0, movedItem);
    newTiers[destContainer] = { ...newTiers[destContainer], bookIds: destTierBookIds };
  }

  return {
    ...state,
    tiers: newTiers,
    unrankedBookIds: newUnrankedBookIds,
  };
}

    case 'CLEAR_ROWS': {
      const booksInTiers = Object.values(state.tiers).flatMap(tier => tier.bookIds);
      const newUnrankedBookIds = Array.from(new Set([...state.unrankedBookIds, ...booksInTiers]));
      return {
        ...state,
        tiers: {},
        tierOrder: [],
        unrankedBookIds: newUnrankedBookIds,
      };
    }

    case 'UPDATE_TIER_SETTINGS': {
      const { tierId, settings } = action.payload;
      if (!state.tiers[tierId]) return state;
      return {
        ...state,
        tiers: {
          ...state.tiers,
          [tierId]: { ...state.tiers[tierId], ...settings },
        },
      };
    }

    case 'REORDER_TIERS': {
      const { activeId, overId } = action.payload;
      const oldIndex = state.tierOrder.indexOf(activeId);
      const newIndex = state.tierOrder.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) {
        return state;
      }
      const newTierOrder = arrayMove(state.tierOrder, oldIndex, newIndex);
      return {
        ...state,
        tierOrder: newTierOrder,
      };
    }

    case 'ADD_BOOKS': {
      const { newBooks } = action.payload;
      const updatedBooks = { ...state.books };
      newBooks.forEach(book => {
        updatedBooks[book.id] = book;
      });
      const updatedUnrankedIds = [...newBooks.map(b => b.id), ...state.unrankedBookIds];
      return {
        ...state,
        books: updatedBooks,
        unrankedBookIds: updatedUnrankedIds,
      };
    }

    case 'DELETE_BOOK': {
      const { bookId } = action.payload;
      const newBooks = { ...state.books };
      delete newBooks[bookId];

      const newTiers = { ...state.tiers };
      Object.keys(newTiers).forEach(tierId => {
        newTiers[tierId] = {
          ...newTiers[tierId],
          bookIds: newTiers[tierId].bookIds.filter(id => id !== bookId),
        };
      });
      const newUnrankedBookIds = state.unrankedBookIds.filter(id => id !== bookId);
      return {
        ...state,
        books: newBooks,
        tiers: newTiers,
        unrankedBookIds: newUnrankedBookIds,
      };
    }

    case 'UPDATE_BOOK': {
      const { bookId, updates } = action.payload;
      if (!state.books[bookId]) return state;
      return {
        ...state,
        books: {
          ...state.books,
          [bookId]: { ...state.books[bookId], ...updates },
        },
      };
    }

    case 'REPLACE_BOOK_IDS': {
      const newBooks = { ...state.books };
      const newUnranked = [...state.unrankedBookIds];
      const newTiers = { ...state.tiers };
      action.payload.forEach(({ tempId, realId }) => {
        if (newBooks[tempId]) {
          newBooks[realId] = { ...newBooks[tempId], id: realId };
          delete newBooks[tempId];
          const idx = newUnranked.indexOf(tempId);
          if (idx !== -1) newUnranked[idx] = realId;
          Object.keys(newTiers).forEach(tierId => {
            const tier = newTiers[tierId];
            const idx = tier.bookIds.indexOf(tempId);
            if (idx !== -1) {
              newTiers[tierId] = {
                ...tier,
                bookIds: [...tier.bookIds]
              };
              newTiers[tierId].bookIds[idx] = realId;
            }
          });
        }
      });
      return { ...state, books: newBooks, unrankedBookIds: newUnranked, tiers: newTiers };
    }

    case 'REPLACE_TIER_IDS': {
      const newTiers = { ...state.tiers };
      const newTierOrder = [...state.tierOrder];
      action.payload.forEach(({ tempId, realId }) => {
        if (newTiers[tempId]) {
          newTiers[realId] = { ...newTiers[tempId], id: realId };
          delete newTiers[tempId];
          // replace in tierOrder
          const idx = newTierOrder.indexOf(tempId);
          if (idx !== -1) newTierOrder[idx] = realId;
        }
      });
      return { ...state, tiers: newTiers, tierOrder: newTierOrder };
    }

    default:
      return state;
  }
};

export const useTierList = (initialData: TierListData, allowSync: boolean = true) => {
  const [listData, dispatch] = useReducer(tierListReducer, initialData);
  const prevInitialDataRef = useRef<TierListData | null>(null);

  useEffect(() => {
    if (!initialData) return;

    const dataChanged = prevInitialDataRef.current?.id !== initialData.id;
    prevInitialDataRef.current = initialData;

    if (allowSync && dataChanged) {
      const isSameList = listData?.id === initialData.id;
      const isEmpty = !listData?.id;
      if (isEmpty || isSameList) {
        tierListHookLogger.info('useTierList: Синхронизация состояния из новых начальных данных', { listId: initialData.id });
        dispatch({ type: 'SET_STATE', payload: initialData });
      } else {
        tierListHookLogger.warn('useTierList: Данные изменились, но ID списка не совпадает. Пропуск.', {
          currentId: listData?.id,
          incomingId: initialData.id
        });
      }
    }
  }, [initialData.id, initialData, allowSync, dispatch, listData?.id]);

  const setTitle = (newTitle: string) => {
    dispatch({ type: 'SET_TITLE', payload: newTitle });
  };

  const addRow = (title: string = 'Новый тир') => {
    dispatch({ type: 'ADD_ROW', payload: { id: `tier-${Date.now()}`, title, color: '#808080' } });
  };

const removeTier = (tierId: string) => {
    dispatch({ type: 'REMOVE_ROW', payload: tierId });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isReorderingTiers =
    listData.tierOrder.includes(String(active.id)) &&
    listData.tierOrder.includes(String(over.id));

    if (isReorderingTiers) {
    dispatch({
      type: 'REORDER_TIERS',
      payload: {
        activeId: String(active.id),
        overId: String(over.id),
      },
    });
    return;
    }

    const activeIsBook = active.data.current?.type === 'book';
    if (activeIsBook) {
      const sourceContainer = active.data.current?.containerId;
      const destContainer = over.data.current?.containerId;
      if (!sourceContainer || !destContainer) {
        return;
    }
      const sourceIndex = active.data.current?.sortable?.index;
    let destIndex;

    if (over.data.current?.sortable) {
      destIndex = over.data.current.sortable.index;
    } else {
      const items = destContainer === UNRANKED_AREA_ID
          ? listData.unrankedBookIds
          : listData.tiers[destContainer]?.bookIds;
      destIndex = items ? items.length : 0;
    }

    if (typeof sourceIndex !== 'number' || typeof destIndex !== 'number') {
      return;
    }

    dispatch({
    type: 'REORDER_ITEMS',
    payload: {
      sourceContainer,
      destContainer,
      sourceIndex,
      destIndex,
    }});
  }
};

const clearRows = () => {
  dispatch({ type: 'CLEAR_ROWS' });
};


const updateTierSettings = (tierId: string, settings: Partial<Omit<Tier, 'id' | 'bookIds'>>) => {
  dispatch({ type: 'UPDATE_TIER_SETTINGS', payload: { tierId, settings } });
};

const renameTier = (tierId: string, newTitle: string) => {
  updateTierSettings(tierId, { title: newTitle });
};

  const addBooks = async (files: File[]) => {
    try {
      tierListHookLogger.info('Обработка загруженных файлов', { fileCount: files.length });
      const newBooks: Book[] = await Promise.all(files.map(async file => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return {
          id: `book-${Date.now()}-${Math.random()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          author: 'Неизвестен',
          coverImageUrl: base64,
        };
      }));

      if (newBooks.length > 0) {
        tierListHookLogger.info('Книги созданы из файлов', { count: newBooks.length });
        dispatch({ type: 'ADD_BOOKS', payload: { newBooks } });
      }
    } catch (err) {
      tierListHookLogger.error(err instanceof Error ? err : new Error(String(err)), { action: 'addBooks' });
    }
  };

  const deleteBook = (bookId: string) => {
    tierListHookLogger.info('Удаление книги', { bookId });
    dispatch({ type: 'DELETE_BOOK', payload: { bookId } });
  };

  const replaceBookIds = (replacements: { tempId: string; realId: string }[]) => {
    dispatch({ type: 'REPLACE_BOOK_IDS', payload: replacements });
  };

  const replaceTierIds = (replacements: { tempId: string; realId: string }[]) => {
    dispatch({ type: 'REPLACE_TIER_IDS', payload: replacements });
  };

  const updateBook = (bookId: string, updates: Partial<Book>) => {
    tierListHookLogger.info('Обновление книги', { bookId, fields: Object.keys(updates) });
    dispatch({ type: 'UPDATE_BOOK', payload: { bookId, updates } });
  };

  return {
    listData,
    dispatch,
    setTitle,
    addRow,
    removeTier,
    handleDragEnd,
    clearRows,
    updateTierSettings,
    renameTier,
    addBooks,
    deleteBook,
    replaceBookIds,
    replaceTierIds,
    updateBook
  };
};
