import type { Template } from '../../types/templates';

// ========== TYPES ==========

export type SectionKey = 'private' | 'public' | 'favorites' | 'archived';
export type ViewMode = 'masonry' | 'compact';

export interface TemplateLibraryState {
  searchQuery: string;
  deleteModalOpen: boolean;
  templateToDelete: Template | null;
  activeSection: SectionKey;
  activeCategory: string;
  viewMode: ViewMode;
  publicPage: number;
}

export type TemplateLibraryAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'OPEN_DELETE_MODAL'; payload: Template }
  | { type: 'CLOSE_DELETE_MODAL' }
  | { type: 'SET_ACTIVE_SECTION'; payload: SectionKey }
  | { type: 'SET_ACTIVE_CATEGORY'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_PUBLIC_PAGE'; payload: number }
  | { type: 'RESET_PUBLIC_PAGE' };

// ========== REDUCER ==========

export const initialState: TemplateLibraryState = {
  searchQuery: '',
  deleteModalOpen: false,
  templateToDelete: null,
  activeSection: 'private',
  activeCategory: 'all',
  viewMode: 'masonry',
  publicPage: 1,
};

export function templateLibraryReducer(
  state: TemplateLibraryState,
  action: TemplateLibraryAction
): TemplateLibraryState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    case 'OPEN_DELETE_MODAL':
      return {
        ...state,
        deleteModalOpen: true,
        templateToDelete: action.payload,
      };

    case 'CLOSE_DELETE_MODAL':
      return {
        ...state,
        deleteModalOpen: false,
        templateToDelete: null,
      };

    case 'SET_ACTIVE_SECTION':
      return {
        ...state,
        activeSection: action.payload,
        // Сбрасываем страницу при переключении на public секцию
        publicPage: action.payload === 'public' ? 1 : state.publicPage,
      };

    case 'SET_ACTIVE_CATEGORY':
      return {
        ...state,
        activeCategory: action.payload,
      };

    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };

    case 'SET_PUBLIC_PAGE':
      return {
        ...state,
        publicPage: action.payload,
      };

    case 'RESET_PUBLIC_PAGE':
      return {
        ...state,
        publicPage: 1,
      };

    default:
      return state;
  }
}
