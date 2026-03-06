import type { PreviewState, PreviewAction } from './types';

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'SET_PREVIEW':
      return {
        url: action.url,
        loadState: action.loadState ?? (action.url ? 'loading' : 'idle'),
      };
    case 'SET_LOAD_STATE':
      return { ...state, loadState: action.loadState };
    default:
      return state;
  }
}
