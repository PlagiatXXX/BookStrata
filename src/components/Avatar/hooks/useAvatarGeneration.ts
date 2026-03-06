import { useEffect, useReducer, useCallback } from 'react';
import { generationReducer } from '../generationReducer';
import type { GenerationState } from '../types';
import { GENERATION_TIMEOUT_MS } from '../constants';

const INITIAL_STATE: GenerationState = {
  isGenerating: false,
  isWaitingForResult: false,
  generationBaseAvatar: null,
  error: null,
};

interface UseAvatarGenerationOptions {
  currentAvatar?: string | null;
  onGenerationComplete?: () => void;
}

interface UseAvatarGenerationReturn {
  generation: GenerationState;
  startGeneration: (baseAvatar: string | null) => void;
  completeGeneration: () => void;
  clearError: () => void;
  handleError: (error: string) => void;
}

/**
 * Хук для управления состоянием генерации AI аватара
 * Обрабатывает таймауты и проверку обновления аватара
 */
export function useAvatarGeneration({
  currentAvatar,
  onGenerationComplete,
}: UseAvatarGenerationOptions): UseAvatarGenerationReturn {
  const [generation, dispatch] = useReducer(generationReducer, INITIAL_STATE);

  /**
   * Начать генерацию
   */
  const startGeneration = useCallback((baseAvatar: string | null) => {
    dispatch({ type: 'START_GENERATION', baseAvatar });
  }, []);

  /**
   * Завершить генерацию (успех)
   */
  const completeGeneration = useCallback(() => {
    dispatch({ type: 'GENERATION_COMPLETE' });
    onGenerationComplete?.();
  }, [onGenerationComplete]);

  /**
   * Очистить ошибку
   */
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  /**
   * Обработать ошибку
   */
  const handleError = useCallback((error: string) => {
    dispatch({ type: 'GENERATION_ERROR', error });
  }, []);

  /**
   * Проверка: если аватар обновился во время ожидания генерации
   */
  useEffect(() => {
    if (!generation.isWaitingForResult) return;
    if (currentAvatar && currentAvatar !== generation.generationBaseAvatar) {
      completeGeneration();
    }
  }, [currentAvatar, generation.isWaitingForResult, generation.generationBaseAvatar, completeGeneration]);

  /**
   * Таймаут генерации (2 минуты)
   */
  useEffect(() => {
    if (!generation.isWaitingForResult) return;

    const timeoutId = setTimeout(() => {
      dispatch({
        type: 'TIMEOUT',
        error: 'Генерация занимает дольше обычного. Попробуйте ещё раз.',
      });
    }, GENERATION_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [generation.isWaitingForResult]);

  return {
    generation,
    startGeneration,
    completeGeneration,
    clearError,
    handleError,
  };
}
