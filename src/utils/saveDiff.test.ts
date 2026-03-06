import { describe, it, expect } from 'vitest';
import { getPlacementsDiff, getTiersDiff, getNewBooks, hasChangesToSave } from './saveDiff';
import type { TierListData } from '@/types';

const createMockTierListData = (overrides?: Partial<TierListData>): TierListData => ({
  id: 'test-list-1',
  title: 'Test List',
  books: {
    '1': { id: '1', title: 'Book 1', author: 'Author 1', coverImageUrl: 'http://example.com/1.jpg' },
    '2': { id: '2', title: 'Book 2', author: 'Author 2', coverImageUrl: 'http://example.com/2.jpg' },
    '3': { id: '3', title: 'Book 3', author: 'Author 3', coverImageUrl: 'http://example.com/3.jpg' },
    'book-temp-1': { id: 'book-temp-1', title: 'New Book', author: 'New Author', coverImageUrl: 'http://example.com/new.jpg' },
  },
  tiers: {
    '1': { id: '1', title: 'S', color: '#FF0000', bookIds: ['1', '2'] },
    '2': { id: '2', title: 'A', color: '#00FF00', bookIds: ['3'] },
    'tier-temp-1': { id: 'tier-temp-1', title: 'New Tier', color: '#0000FF', bookIds: [] },
  },
  tierOrder: ['1', '2', 'tier-temp-1'],
  unrankedBookIds: ['book-temp-1'],
  tierIdToTempIdMap: {},
  ...overrides,
});

describe('saveDiff utilities', () => {
  describe('getPlacementsDiff', () => {
    it('должен возвращать placements для всех книг с реальными ID', () => {
      const listData = createMockTierListData();
      
      const placements = getPlacementsDiff(listData);
      
      // 3 книги в тирах (1, 2, 3) + 0 в unranked (book-temp-1 пропускается)
      expect(placements).toHaveLength(3);
      expect(placements).toEqual([
        { bookId: 1, tierId: 1, rank: 0 },
        { bookId: 2, tierId: 1, rank: 1 },
        { bookId: 3, tierId: 2, rank: 0 },
      ]);
    });

    it('должен пропускать книги с временными ID', () => {
      const listData = createMockTierListData();
      
      const placements = getPlacementsDiff(listData);
      
      // Временные ID не должны быть включены
      const tempBookPlacements = placements.filter(p => 
        String(p.bookId).startsWith('book-')
      );
      expect(tempBookPlacements).toHaveLength(0);
    });

    it('должен возвращать пустой массив если нет книг', () => {
      const listData = createMockTierListData({
        tiers: {},
        tierOrder: [],
        unrankedBookIds: [],
        books: {},
      });
      
      const placements = getPlacementsDiff(listData);
      
      expect(placements).toEqual([]);
    });
  });

  describe('getTiersDiff', () => {
    it('должен разделять новые и существующие тиры', () => {
      const listData = createMockTierListData();
      
      const diff = getTiersDiff(listData);
      
      expect(diff.added).toHaveLength(1); // tier-temp-1
      expect(diff.updated).toHaveLength(2); // 1 и 2
      expect(diff.deletedIds).toEqual([]);
    });

    it('должен добавлять новые тиры в added', () => {
      const listData = createMockTierListData();
      
      const diff = getTiersDiff(listData);
      
      expect(diff.added).toEqual([
        { title: 'New Tier', color: '#0000FF', rank: 2 },
      ]);
    });

    it('должен добавлять существующие тиры в updated', () => {
      const listData = createMockTierListData();
      
      const diff = getTiersDiff(listData);
      
      expect(diff.updated).toEqual([
        { id: 1, title: 'S', color: '#FF0000', rank: 0 },
        { id: 2, title: 'A', color: '#00FF00', rank: 1 },
      ]);
    });

    it('должен возвращать пустые массивы если нет тиров', () => {
      const listData = createMockTierListData({
        tiers: {},
        tierOrder: [],
      });
      
      const diff = getTiersDiff(listData);
      
      expect(diff.added).toEqual([]);
      expect(diff.updated).toEqual([]);
    });
  });

  describe('getNewBooks', () => {
    it('должен возвращать только книги с временными ID', () => {
      const listData = createMockTierListData();
      
      const newBooks = getNewBooks(listData);
      
      expect(newBooks).toHaveLength(1);
      expect(newBooks[0].id).toBe('book-temp-1');
      expect(newBooks[0].title).toBe('New Book');
    });

    it('должен возвращать пустой массив если нет новых книг', () => {
      const listData = createMockTierListData({
        books: {
          '1': { id: '1', title: 'Book 1', author: 'Author 1', coverImageUrl: 'http://example.com/1.jpg' },
        },
        unrankedBookIds: [],
        tiers: {
          '1': { id: '1', title: 'S', color: '#FF0000', bookIds: ['1'] },
        },
        tierOrder: ['1'],
      });
      
      const newBooks = getNewBooks(listData);
      
      expect(newBooks).toEqual([]);
    });

    it('должен включать все поля книги', () => {
      const listData = createMockTierListData({
        books: {
          'book-temp-1': {
            id: 'book-temp-1',
            title: 'Test Book',
            author: 'Test Author',
            coverImageUrl: 'http://example.com/test.jpg',
            description: 'Test description',
            thoughts: 'Test thoughts',
          },
        },
        unrankedBookIds: ['book-temp-1'],
        tiers: {},
        tierOrder: [],
      });
      
      const newBooks = getNewBooks(listData);
      
      expect(newBooks[0]).toEqual({
        id: 'book-temp-1',
        title: 'Test Book',
        author: 'Test Author',
        coverImageUrl: 'http://example.com/test.jpg',
        description: 'Test description',
        thoughts: 'Test thoughts',
      });
    });
  });

  describe('hasChangesToSave', () => {
    it('должен возвращать true если есть изменения в placements', () => {
      const listData = createMockTierListData();
      
      const result = hasChangesToSave(listData);
      
      expect(result).toBe(true);
    });

    it('должен возвращать true если есть изменения в tiers', () => {
      const listData = createMockTierListData({
        tiers: {
          'tier-temp-1': { id: 'tier-temp-1', title: 'New', color: '#000', bookIds: [] },
        },
        tierOrder: ['tier-temp-1'],
        unrankedBookIds: [],
        books: {},
      });
      
      const result = hasChangesToSave(listData);
      
      expect(result).toBe(true);
    });

    it('должен возвращать false если нет изменений', () => {
      const listData = createMockTierListData({
        tiers: {},
        tierOrder: [],
        unrankedBookIds: [],
        books: {},
      });
      
      const result = hasChangesToSave(listData);
      
      expect(result).toBe(false);
    });
  });
});
