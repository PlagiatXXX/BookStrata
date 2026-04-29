/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTierList } from './useTierList';
import type { TierListData } from '@/types';

const createMockTierListData = (): TierListData => ({
  id: 'test-list-1',
  title: 'Тестовый тир-лист',
  books: {
    'book-1': { id: 'book-1', title: 'Книга 1', author: 'Автор 1', coverImageUrl: '' },
  },
  tiers: {
    'tier-1': { id: 'tier-1', title: 'S', color: '#FF6B6B', bookIds: ['book-1'] },
  },
  tierOrder: ['tier-1'],
  unrankedBookIds: [],
  tierIdToTempIdMap: {},
});

describe('useTierList Referential Integrity', () => {
  it('SET_TITLE should return same state if title is identical', () => {
    const initialData = createMockTierListData();
    const { result } = renderHook(() => useTierList(initialData));

    const stateBefore = result.current.listData;
    act(() => {
      result.current.setTitle(initialData.title);
    });
    expect(result.current.listData).toBe(stateBefore);
  });

  it('UPDATE_BOOK should return same state if updates are redundant', () => {
    const initialData = createMockTierListData();
    const { result } = renderHook(() => useTierList(initialData));

    const stateBefore = result.current.listData;
    act(() => {
      result.current.updateBook('book-1', { title: 'Книга 1' });
    });
    expect(result.current.listData).toBe(stateBefore);
  });

  it('UPDATE_TIER_SETTINGS should return same state if settings are redundant', () => {
    const initialData = createMockTierListData();
    const { result } = renderHook(() => useTierList(initialData));

    const stateBefore = result.current.listData;
    act(() => {
      result.current.updateTierSettings('tier-1', { title: 'S', color: '#FF6B6B' });
    });
    expect(result.current.listData).toBe(stateBefore);
  });

  it('REORDER_ITEMS should return same state if indices are identical', () => {
    const initialData = createMockTierListData();
    const { result } = renderHook(() => useTierList(initialData));

    const stateBefore = result.current.listData;
    act(() => {
        result.current.dispatch({
            type: 'REORDER_ITEMS',
            payload: {
                sourceContainer: 'tier-1',
                destContainer: 'tier-1',
                sourceIndex: 0,
                destIndex: 0
            }
        });
    });
    expect(result.current.listData).toBe(stateBefore);
  });

  it('REORDER_TIERS should return same state if indices are identical', () => {
    const initialData = createMockTierListData();
    const { result } = renderHook(() => useTierList(initialData));

    const stateBefore = result.current.listData;
    act(() => {
        result.current.dispatch({
            type: 'REORDER_TIERS',
            payload: {
                activeId: 'tier-1',
                overId: 'tier-1'
            }
        });
    });
    expect(result.current.listData).toBe(stateBefore);
  });
});
