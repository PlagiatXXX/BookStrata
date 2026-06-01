export type SectionKey = 'private' | 'public' | 'favorites';

export interface TemplateLibraryState {
  activeSection: SectionKey;
  publicPage: number;
}

export type TemplateLibraryAction =
  | { type: 'SET_ACTIVE_SECTION'; payload: SectionKey }
  | { type: 'SET_PUBLIC_PAGE'; payload: number };

export const initialState: TemplateLibraryState = {
  activeSection: 'private',
  publicPage: 1,
};

export function templateLibraryReducer(
  state: TemplateLibraryState,
  action: TemplateLibraryAction,
): TemplateLibraryState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      if (state.activeSection === action.payload) return state;
      return {
        ...state,
        activeSection: action.payload,
        publicPage: action.payload === 'public' ? 1 : state.publicPage,
      };

    case 'SET_PUBLIC_PAGE':
      if (state.publicPage === action.payload) return state;
      return { ...state, publicPage: action.payload };

    default:
      return state;
  }
}