/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTierEditorBlocker } from './useTierEditorBlocker';

// Мокаем useBlocker из react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useBlocker: vi.fn(() => ({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    })),
  };
});

// Мокаем logger и sileo
const mockLogger = {
  error: vi.fn(),
};

const mockSileo = {
  error: vi.fn(),
};

describe('useTierEditorBlocker', () => {
  const mockParams = {
    isReadOnly: false,
    ignoreUnsavedBlocker: false,
    hasUnsavedChanges: true,
    autoSaveStatus: 'idle' as const,
    isUpdatingBook: false,
    setShowUnsavedModal: vi.fn(),
    setIgnoreUnsavedBlocker: vi.fn(),
    setDeletedTierIds: vi.fn(),
    setIsSavingBeforeLeave: vi.fn(),
    cancel: vi.fn(),
    forceSave: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
    logger: mockLogger,
    sileo: mockSileo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Очищаем слушатели событий после каждого теста
    vi.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен возвращать все функции', () => {
      const { result } = renderHook(
        () => useTierEditorBlocker(mockParams)
      );

      expect(result.current.handleMyRatingsClick).toBeDefined();
      expect(typeof result.current.handleMyRatingsClick).toBe('function');
      expect(result.current.handleSaveBeforeLeave).toBeDefined();
      expect(typeof result.current.handleSaveBeforeLeave).toBe('function');
      expect(result.current.handleConfirmLeave).toBeDefined();
      expect(typeof result.current.handleConfirmLeave).toBe('function');
      expect(result.current.handleCancelLeave).toBeDefined();
      expect(typeof result.current.handleCancelLeave).toBe('function');
    });
  });

  describe('handleMyRatingsClick', () => {
    it('должен сбрасывать deletedTierIds и переходить на главную', () => {
      const { result } = renderHook(
        () => useTierEditorBlocker(mockParams)
      );

      result.current.handleMyRatingsClick();

      expect(mockParams.setDeletedTierIds).toHaveBeenCalledWith([]);
      expect(mockParams.navigate).toHaveBeenCalledWith('/');
    });
  });

  describe('handleSaveBeforeLeave', () => {
    it('должен вызывать forceSave и proceed', async () => {
      const { result } = renderHook(
        () => useTierEditorBlocker(mockParams)
      );

      await result.current.handleSaveBeforeLeave();

      expect(mockParams.setIsSavingBeforeLeave).toHaveBeenCalledWith(true);
      expect(mockParams.cancel).toHaveBeenCalled();
      expect(mockParams.forceSave).toHaveBeenCalled();
      expect(mockParams.setShowUnsavedModal).toHaveBeenCalledWith(false);
      expect(mockParams.setIgnoreUnsavedBlocker).toHaveBeenCalledWith(true);
      expect(mockParams.setIsSavingBeforeLeave).toHaveBeenCalledWith(false);
    });

    it('должен обрабатывать ошибку при сохранении', async () => {
      mockParams.forceSave.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(
        () => useTierEditorBlocker(mockParams)
      );

      await result.current.handleSaveBeforeLeave();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockSileo.error).toHaveBeenCalledWith({
        title: 'Не удалось сохранить',
        description: 'Попробуйте выйти без сохранения',
        duration: 3000,
      });
    });
  });

  describe('handleConfirmLeave', () => {
    it('должен закрывать модальное окно и продолжать навигацию', () => {
      const { result } = renderHook(
        () => useTierEditorBlocker(mockParams)
      );

      result.current.handleConfirmLeave();

      expect(mockParams.setShowUnsavedModal).toHaveBeenCalledWith(false);
      expect(mockParams.setIgnoreUnsavedBlocker).toHaveBeenCalledWith(true);
    });
  });

  describe('handleCancelLeave', () => {
    it('должен закрывать модальное окно и сбрасывать навигацию', () => {
      const { result } = renderHook(
        () => useTierEditorBlocker(mockParams)
      );

      result.current.handleCancelLeave();

      expect(mockParams.setShowUnsavedModal).toHaveBeenCalledWith(false);
      expect(mockParams.setDeletedTierIds).toHaveBeenCalledWith([]);
    });
  });

  describe('beforeunload событие', () => {
    it('должен добавлять и удалять слушатель beforeunload', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(
        () => useTierEditorBlocker({
          ...mockParams,
          hasUnsavedChanges: true,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });
});
