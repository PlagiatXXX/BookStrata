import { useEffect, useReducer, useCallback } from 'react';
import { previewReducer } from '../previewReducer';
import type { PreviewState, PreviewLoadState } from '../types';
import {
  PREVIEW_POLLING_MAX_ATTEMPTS,
  PREVIEW_POLLING_DELAY_MS,
} from '../constants';

const INITIAL_STATE: PreviewState = {
  url: null,
  loadState: 'idle',
};

/**
 * Хук для управления состоянием preview изображения
 * Реализует polling-механизм для загрузки превью
 */
export function useAvatarPreview() {
  const [preview, dispatch] = useReducer(previewReducer, INITIAL_STATE);

  /**
   * Установить URL превью
   */
  const setPreviewUrl = useCallback((url: string | null) => {
    dispatch({
      type: 'SET_PREVIEW',
      url,
      loadState: url ? 'loading' : 'idle',
    });
  }, []);

  /**
   * Обновить состояние загрузки
   */
  const setLoadState = useCallback((loadState: PreviewLoadState) => {
    dispatch({ type: 'SET_LOAD_STATE', loadState });
  }, []);

  /**
   * Сбросить состояние превью
   */
  const resetPreview = useCallback(() => {
    dispatch({ type: 'SET_PREVIEW', url: null, loadState: 'idle' });
  }, []);

  // Polling-механизм для загрузки preview изображения
  useEffect(() => {
    if (!preview.url) {
      dispatch({ type: 'SET_LOAD_STATE', loadState: 'idle' });
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const tryLoad = () => {
      if (cancelled) return;

      dispatch({ type: 'SET_LOAD_STATE', loadState: 'loading' });

      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        dispatch({ type: 'SET_LOAD_STATE', loadState: 'ready' });
      };
      img.onerror = () => {
        if (cancelled) return;
        attempt += 1;
        if (attempt >= PREVIEW_POLLING_MAX_ATTEMPTS) {
          dispatch({ type: 'SET_LOAD_STATE', loadState: 'error' });
          return;
        }
        setTimeout(tryLoad, PREVIEW_POLLING_DELAY_MS);
      };

      if (preview.url) {
        img.src = preview.url;
      }
    };

    tryLoad();

    return () => {
      cancelled = true;
    };
  }, [preview.url]);

  return {
    preview,
    setPreviewUrl,
    setLoadState,
    resetPreview,
  };
}
