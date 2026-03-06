import type { GenerationState, GenerationAction } from './types';

export function generationReducer(
  state: GenerationState,
  action: GenerationAction,
): GenerationState {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        isGenerating: true,
        isWaitingForResult: false,
        generationBaseAvatar: action.baseAvatar,
        error: null,
      };
    case 'GENERATION_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        error: null,
      };
    case 'GENERATION_ERROR':
      return {
        ...state,
        isGenerating: false,
        error: action.error,
      };
    case 'GENERATION_COMPLETE':
      return {
        ...state,
        isGenerating: false,
        isWaitingForResult: false,
      };
    case 'TIMEOUT':
      return {
        ...state,
        isWaitingForResult: false,
        isGenerating: false,
        error: action.error,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}
