/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardState } from './useDashboardState';
import type { TierListShort } from '@/lib/api';

const mockTierList: TierListShort = {
  id: 1,
  title: 'Test Tier List',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  isPublic: true,
  user: { id: 1, username: 'testuser' },
  likesCount: 5,
};

describe('useDashboardState', () => {
  describe('initial state', () => {
    it('должен иметь правильные начальные значения', () => {
      const { result } = renderHook(() => useDashboardState());

      expect(result.current.state).toEqual({
        currentPage: 1,
        searchQuery: '',
        activeModal: null,
        tierListToRename: null,
        tierListToDelete: null,
        renameTitle: '',
        createTitle: '',
        filterOption: 'all',
        sortOption: 'newest',
      });
    });
  });

  describe('setCurrentPage', () => {
    it('должен обновлять currentPage', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.setCurrentPage(5);
      });

      expect(result.current.state.currentPage).toBe(5);
    });
  });

  describe('setSearchQuery', () => {
    it('должен обновлять searchQuery', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.state.searchQuery).toBe('test query');
    });

    it('должен сбрасывать currentPage на 1 при изменении поиска', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.setCurrentPage(5);
        result.current.setSearchQuery('test');
      });

      expect(result.current.state.currentPage).toBe(1);
      expect(result.current.state.searchQuery).toBe('test');
    });
  });

  describe('openCreateModal', () => {
    it('должен открывать modal создания и очищать createTitle', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.state.activeModal).toBe('create');
      expect(result.current.state.createTitle).toBe('');
    });
  });

  describe('openRenameModal', () => {
    it('должен открывать modal переименования и устанавливать tierListToRename', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.openRenameModal(mockTierList);
      });

      expect(result.current.state.activeModal).toBe('rename');
      expect(result.current.state.tierListToRename).toBe(mockTierList);
      expect(result.current.state.renameTitle).toBe(mockTierList.title);
    });
  });

  describe('openDeleteModal', () => {
    it('должен открывать modal удаления и устанавливать tierListToDelete', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.openDeleteModal(mockTierList);
      });

      expect(result.current.state.activeModal).toBe('delete');
      expect(result.current.state.tierListToDelete).toBe(mockTierList);
    });
  });

  describe('closeModal', () => {
    it('должен закрывать любую modal и сбрасывать состояния', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.openRenameModal(mockTierList);
        result.current.closeModal();
      });

      expect(result.current.state.activeModal).toBeNull();
      expect(result.current.state.tierListToRename).toBeNull();
      expect(result.current.state.renameTitle).toBe('');
    });

    it('должен сбрасывать modal удаления', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.openDeleteModal(mockTierList);
        result.current.closeModal();
      });

      expect(result.current.state.activeModal).toBeNull();
      expect(result.current.state.tierListToDelete).toBeNull();
    });
  });

  describe('setRenameTitle', () => {
    it('должен обновлять renameTitle', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.setRenameTitle('New Title');
      });

      expect(result.current.state.renameTitle).toBe('New Title');
    });
  });

  describe('setCreateTitle', () => {
    it('должен обновлять createTitle', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.setCreateTitle('New Tier List');
      });

      expect(result.current.state.createTitle).toBe('New Tier List');
    });
  });

  describe('resetState', () => {
    it('должен сбрасывать состояние к начальным значениям', () => {
      const { result } = renderHook(() => useDashboardState());

      act(() => {
        result.current.setCurrentPage(5);
        result.current.setSearchQuery('test');
        result.current.openCreateModal();
        result.current.resetState();
      });

      expect(result.current.state).toEqual({
        currentPage: 1,
        searchQuery: '',
        activeModal: null,
        tierListToRename: null,
        tierListToDelete: null,
        renameTitle: '',
        createTitle: '',
        filterOption: 'all',
        sortOption: 'newest',
      });
    });
  });

  describe('комбинация действий', () => {
    it('должен корректно обрабатывать последовательность действий', () => {
      const { result } = renderHook(() => useDashboardState());

      // Пользователь открывает modal создания
      act(() => {
        result.current.openCreateModal();
      });
      expect(result.current.state.activeModal).toBe('create');

      // Вводит название
      act(() => {
        result.current.setCreateTitle('My List');
      });
      expect(result.current.state.createTitle).toBe('My List');

      // Закрывает modal
      act(() => {
        result.current.closeModal();
      });
      expect(result.current.state.activeModal).toBeNull();

      // Открывает modal переименования
      act(() => {
        result.current.openRenameModal(mockTierList);
      });
      expect(result.current.state.activeModal).toBe('rename');
      expect(result.current.state.tierListToRename).toBe(mockTierList);
    });
  });
});
