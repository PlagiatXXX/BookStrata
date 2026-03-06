/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTierEditorState } from './useTierEditorState';
import type { Book } from '@/types';

describe('useTierEditorState', () => {
  describe('Инициализация', () => {
    it('должен инициализировать все состояния со значениями по умолчанию', () => {
      const { result } = renderHook(() => useTierEditorState());

      // Состояния для отслеживания несохраненных изменений
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.deletedTierIds).toEqual([]);

      // Состояния модальных окон
      expect(result.current.showUnsavedModal).toBe(false);
      expect(result.current.showDeleteRatingModal).toBe(false);
      expect(result.current.ignoreUnsavedBlocker).toBe(false);
      expect(result.current.isSearchModalOpen).toBe(false);
      expect(result.current.isSavingBeforeLeave).toBe(false);

      // D&D состояния
      expect(result.current.activeItem).toBeNull();
      expect(result.current.tierToDelete).toBeNull();
      expect(result.current.bookToDelete).toBeNull();
      expect(result.current.activeTierId).toBeNull();
      expect(result.current.isClearAllModalOpen).toBe(false);
      expect(result.current.bookToEdit).toBeNull();
      expect(result.current.bookToView).toBeNull();
    });
  });

  describe('Состояния для отслеживания несохраненных изменений', () => {
    it('должен обновлять hasUnsavedChanges', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setHasUnsavedChanges(true);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('должен обновлять deletedTierIds', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setDeletedTierIds([1, 2, 3]);
      });

      expect(result.current.deletedTierIds).toEqual([1, 2, 3]);
    });

    it('должен добавлять deletedTierIds через функциональное обновление', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setDeletedTierIds((prev) => [...prev, 5]);
      });

      expect(result.current.deletedTierIds).toEqual([5]);
    });
  });

  describe('Состояния модальных окон', () => {
    it('должен обновлять showUnsavedModal', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setShowUnsavedModal(true);
      });

      expect(result.current.showUnsavedModal).toBe(true);
    });

    it('должен обновлять showDeleteRatingModal', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setShowDeleteRatingModal(true);
      });

      expect(result.current.showDeleteRatingModal).toBe(true);
    });

    it('должен обновлять ignoreUnsavedBlocker', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setIgnoreUnsavedBlocker(true);
      });

      expect(result.current.ignoreUnsavedBlocker).toBe(true);
    });

    it('должен обновлять isSearchModalOpen', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setIsSearchModalOpen(true);
      });

      expect(result.current.isSearchModalOpen).toBe(true);
    });

    it('должен обновлять isSavingBeforeLeave', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setIsSavingBeforeLeave(true);
      });

      expect(result.current.isSavingBeforeLeave).toBe(true);
    });
  });

  describe('D&D состояния', () => {
    it('должен обновлять activeItem', () => {
      const { result } = renderHook(() => useTierEditorState());

      const mockBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/cover.jpg',
      };

      act(() => {
        result.current.setActiveItem(mockBook);
      });

      expect(result.current.activeItem).toEqual(mockBook);
    });

    it('должен обновлять tierToDelete', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setTierToDelete('tier-1');
      });

      expect(result.current.tierToDelete).toBe('tier-1');
    });

    it('должен обновлять bookToDelete', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setBookToDelete('book-1');
      });

      expect(result.current.bookToDelete).toBe('book-1');
    });

    it('должен обновлять activeTierId', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setActiveTierId('tier-1');
      });

      expect(result.current.activeTierId).toBe('tier-1');
    });

    it('должен обновлять isClearAllModalOpen', () => {
      const { result } = renderHook(() => useTierEditorState());

      act(() => {
        result.current.setIsClearAllModalOpen(true);
      });

      expect(result.current.isClearAllModalOpen).toBe(true);
    });

    it('должен обновлять bookToEdit', () => {
      const { result } = renderHook(() => useTierEditorState());

      const mockBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/cover.jpg',
      };

      act(() => {
        result.current.setBookToEdit(mockBook);
      });

      expect(result.current.bookToEdit).toEqual(mockBook);
    });

    it('должен обновлять bookToView', () => {
      const { result } = renderHook(() => useTierEditorState());

      const mockBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/cover.jpg',
      };

      act(() => {
        result.current.setBookToView(mockBook);
      });

      expect(result.current.bookToView).toEqual(mockBook);
    });
  });

  describe('Сброс состояний', () => {
    it('должен сбрасывать activeItem в null', () => {
      const { result } = renderHook(() => useTierEditorState());

      const mockBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/cover.jpg',
      };

      act(() => {
        result.current.setActiveItem(mockBook);
      });

      expect(result.current.activeItem).toEqual(mockBook);

      act(() => {
        result.current.setActiveItem(null);
      });

      expect(result.current.activeItem).toBeNull();
    });

    it('должен сбрасывать bookToEdit в null', () => {
      const { result } = renderHook(() => useTierEditorState());

      const mockBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/cover.jpg',
      };

      act(() => {
        result.current.setBookToEdit(mockBook);
      });

      act(() => {
        result.current.setBookToEdit(null);
      });

      expect(result.current.bookToEdit).toBeNull();
    });

    it('должен сбрасывать bookToView в null', () => {
      const { result } = renderHook(() => useTierEditorState());

      const mockBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/cover.jpg',
      };

      act(() => {
        result.current.setBookToView(mockBook);
      });

      act(() => {
        result.current.setBookToView(null);
      });

      expect(result.current.bookToView).toBeNull();
    });
  });
});
