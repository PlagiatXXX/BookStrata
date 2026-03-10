import { useReducer, useCallback } from 'react';
import type { TierListShort } from '@/lib/api';
import type { DashboardState, DashboardAction, SortOption, FilterOption } from '../types';

const initialState: DashboardState = {
  currentPage: 1,
  searchQuery: '',
  activeModal: null,
  tierListToRename: null,
  tierListToDelete: null,
  renameTitle: '',
  createTitle: '',
  sortOption: 'newest',
  filterOption: 'all',
};

function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPage: action.payload,
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
        currentPage: 1, // Сброс на первую страницу при поиске
      };

    case 'OPEN_CREATE_MODAL':
      return {
        ...state,
        activeModal: 'create',
        createTitle: '',
      };

    case 'OPEN_RENAME_MODAL':
      return {
        ...state,
        activeModal: 'rename',
        tierListToRename: action.payload,
        renameTitle: action.payload.title,
      };

    case 'OPEN_DELETE_MODAL':
      return {
        ...state,
        activeModal: 'delete',
        tierListToDelete: action.payload,
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        activeModal: null,
        tierListToRename: null,
        tierListToDelete: null,
        renameTitle: '',
      };

    case 'SET_RENAME_TITLE':
      return {
        ...state,
        renameTitle: action.payload,
      };

    case 'SET_CREATE_TITLE':
      return {
        ...state,
        createTitle: action.payload,
      };

    case 'SET_SORT_OPTION':
      return {
        ...state,
        sortOption: action.payload,
      };

    case 'SET_FILTER_OPTION':
      return {
        ...state,
        filterOption: action.payload,
      };

    case 'RESET_STATE':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

interface UseDashboardStateReturn {
  state: DashboardState;
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  openCreateModal: () => void;
  openRenameModal: (tierList: TierListShort) => void;
  openDeleteModal: (tierList: TierListShort) => void;
  closeModal: () => void;
  setRenameTitle: (title: string) => void;
  setCreateTitle: (title: string) => void;
  setSortOption: (sort: SortOption) => void;
  setFilterOption: (filter: FilterOption) => void;
  resetState: () => void;
}

/**
 * Хук для управления состоянием DashboardPage
 * Заменяет 9 useState на useReducer
 */
export function useDashboardState(): UseDashboardStateReturn {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const openCreateModal = useCallback(() => {
    dispatch({ type: 'OPEN_CREATE_MODAL' });
  }, []);

  const openRenameModal = useCallback((tierList: TierListShort) => {
    dispatch({ type: 'OPEN_RENAME_MODAL', payload: tierList });
  }, []);

  const openDeleteModal = useCallback((tierList: TierListShort) => {
    dispatch({ type: 'OPEN_DELETE_MODAL', payload: tierList });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const setRenameTitle = useCallback((title: string) => {
    dispatch({ type: 'SET_RENAME_TITLE', payload: title });
  }, []);

  const setCreateTitle = useCallback((title: string) => {
    dispatch({ type: 'SET_CREATE_TITLE', payload: title });
  }, []);

  const setSortOption = useCallback((sort: SortOption) => {
    dispatch({ type: 'SET_SORT_OPTION', payload: sort });
  }, []);

  const setFilterOption = useCallback((filter: FilterOption) => {
    dispatch({ type: 'SET_FILTER_OPTION', payload: filter });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  return {
    state,
    setCurrentPage,
    setSearchQuery,
    openCreateModal,
    openRenameModal,
    openDeleteModal,
    closeModal,
    setRenameTitle,
    setCreateTitle,
    setSortOption,
    setFilterOption,
    resetState,
  };
}
