import { renderHook } from '@testing-library/react';
import type { TierListShort } from '@/lib/tierListApi';
import { useTierListSorting } from './useTierListSorting';

const mockTierLists: TierListShort[] = [
  {
    id: 1,
    title: 'Zebra Animals',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: "string",
    isPublic: true,
    likesCount: 5,
  },
  {
    id: 2,
    title: 'Alpha Books',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: "string",
    isPublic: false,
    likesCount: 10,
  },
  {
    id: 3,
    title: 'Beta Movies',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: "string",
    isPublic: true,
    likesCount: 3,
  },
];

describe('useTierListSorting', () => {
  it('should return tier lists sorted by newest first', () => {
    const { result } = renderHook(() =>
      useTierListSorting({ tierLists: mockTierLists, sortOption: 'newest' })
    );

    expect(result.current.sortedTierLists).toHaveLength(3);
    expect(result.current.sortedTierLists[0].id).toBe(3); // 2024-01-20
    expect(result.current.sortedTierLists[1].id).toBe(1); // 2024-01-15
    expect(result.current.sortedTierLists[2].id).toBe(2); // 2024-01-10
  });

  it('should return tier lists sorted by oldest first', () => {
    const { result } = renderHook(() =>
      useTierListSorting({ tierLists: mockTierLists, sortOption: 'oldest' })
    );

    expect(result.current.sortedTierLists).toHaveLength(3);
    expect(result.current.sortedTierLists[0].id).toBe(2); // 2024-01-10
    expect(result.current.sortedTierLists[1].id).toBe(1); // 2024-01-15
    expect(result.current.sortedTierLists[2].id).toBe(3); // 2024-01-20
  });

  it('should return tier lists sorted by title ascending', () => {
    const { result } = renderHook(() =>
      useTierListSorting({ tierLists: mockTierLists, sortOption: 'title-asc' })
    );

    expect(result.current.sortedTierLists).toHaveLength(3);
    expect(result.current.sortedTierLists[0].title).toBe('Alpha Books');
    expect(result.current.sortedTierLists[1].title).toBe('Beta Movies');
    expect(result.current.sortedTierLists[2].title).toBe('Zebra Animals');
  });

  it('should return tier lists sorted by likes count', () => {
    const { result } = renderHook(() =>
      useTierListSorting({ tierLists: mockTierLists, sortOption: 'likes' })
    );

    expect(result.current.sortedTierLists).toHaveLength(3);
    expect(result.current.sortedTierLists[0].id).toBe(2); // 10 likes
    expect(result.current.sortedTierLists[1].id).toBe(1); // 5 likes
    expect(result.current.sortedTierLists[2].id).toBe(3); // 3 likes
  });

  it('should handle empty array', () => {
    const { result } = renderHook(() =>
      useTierListSorting({ tierLists: [], sortOption: 'newest' })
    );

    expect(result.current.sortedTierLists).toHaveLength(0);
  });

  it('should not mutate the original array', () => {
    const originalArray = [...mockTierLists];

    renderHook(() =>
      useTierListSorting({ tierLists: mockTierLists, sortOption: 'newest' })
    );

    expect(mockTierLists).toEqual(originalArray);
  });

  it('should handle undefined likesCount gracefully', () => {
    const tierListsUndefinedLikes: TierListShort[] = [
      {
        id: 1,
        title: 'Test 1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: "string",
        isPublic: true,
      },
      {
        id: 2,
        title: 'Test 2',
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: "string",
        isPublic: true,
        likesCount: 5,
      },
    ];

    const { result } = renderHook(() =>
      useTierListSorting({ tierLists: tierListsUndefinedLikes, sortOption: 'likes' })
    );

    // Item with likesCount should come first
    expect(result.current.sortedTierLists[0].id).toBe(2);
    expect(result.current.sortedTierLists[1].id).toBe(1);
  });
});