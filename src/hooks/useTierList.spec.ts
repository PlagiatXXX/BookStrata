/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTierList } from './useTierList';
import type { TierListData } from '@/types';

// Вспомогательная функция для создания тестовых данных
const createMockTierListData = (): TierListData => ({
  id: 'test-list-1',
  title: 'Тестовый тир-лист',
  books: {
    'book-1': {
      id: 'book-1',
      title: 'Книга 1',
      author: 'Автор 1',
      coverImageUrl: 'http://example.com/cover1.jpg',
    },
    'book-2': {
      id: 'book-2',
      title: 'Книга 2',
      author: 'Автор 2',
      coverImageUrl: 'http://example.com/cover2.jpg',
    },
    'book-3': {
      id: 'book-3',
      title: 'Книга 3',
      author: 'Автор 3',
      coverImageUrl: 'http://example.com/cover3.jpg',
    },
  },
  tiers: {
    'tier-1': {
      id: 'tier-1',
      title: 'S',
      color: '#FF6B6B',
      bookIds: ['book-1'],
    },
    'tier-2': {
      id: 'tier-2',
      title: 'A',
      color: '#4ECDC4',
      bookIds: ['book-2'],
    },
  },
  tierOrder: ['tier-1', 'tier-2'],
  unrankedBookIds: ['book-3'],
  tierIdToTempIdMap: {},
});

describe('useTierList', () => {
  let initialData: TierListData;

  beforeEach(() => {
    initialData = createMockTierListData();
  });

  describe('Инициализация', () => {
    it('должен инициализироваться с начальными данными', () => {
      const { result } = renderHook(() => useTierList(initialData));

      expect(result.current.listData.id).toBe('test-list-1');
      expect(result.current.listData.title).toBe('Тестовый тир-лист');
      expect(Object.keys(result.current.listData.books).length).toBe(3);
      expect(result.current.listData.tierOrder).toEqual(['tier-1', 'tier-2']);
    });
  });

  describe('setTitle', () => {
    it('должен обновлять заголовок тир-листа', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.setTitle('Новый заголовок');
      });

      expect(result.current.listData.title).toBe('Новый заголовок');
    });
  });

  describe('addRow', () => {
    it('должен добавлять новый тир с параметрами по умолчанию', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.addRow();
      });

      const newTierId = result.current.listData.tierOrder[2];
      expect(result.current.listData.tierOrder.length).toBe(3);
      expect(result.current.listData.tiers[newTierId]).toBeDefined();
      expect(result.current.listData.tiers[newTierId].title).toBe('Новый тир');
      expect(result.current.listData.tiers[newTierId].color).toBe('#808080');
      expect(result.current.listData.tiers[newTierId].bookIds).toEqual([]);
    });

    it('должен добавлять новый тир с кастомным заголовком', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.addRow('B');
      });

      const newTierId = result.current.listData.tierOrder[2];
      expect(result.current.listData.tiers[newTierId].title).toBe('B');
    });
  });

  describe('removeTier', () => {
    it('должен удалять тир и перемещать книги в unranked', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.removeTier('tier-1');
      });

      expect(result.current.listData.tierOrder.length).toBe(1);
      expect(result.current.listData.tierOrder).toEqual(['tier-2']);
      expect(result.current.listData.tiers['tier-1']).toBeUndefined();
      expect(result.current.listData.unrankedBookIds).toContain('book-1');
    });

    it('не должен падать при удалении несуществующего тира', () => {
      const { result } = renderHook(() => useTierList(initialData));

      expect(() => {
        act(() => {
          result.current.removeTier('non-existent-tier');
        });
      }).not.toThrow();
    });
  });

  describe('handleDragEnd - перемещение внутри контейнера', () => {
    it('должен перемещать книги внутри одного тира', () => {
      const { result } = renderHook(() => useTierList(initialData));

      const mockEvent = {
        active: {
          id: 'book-1',
          data: {
            current: {
              type: 'book',
              containerId: 'tier-1',
              sortable: { index: 0 },
            },
          },
        },
        over: {
          id: 'tier-1',
          data: {
            current: {
              sortable: { index: 1 },
            },
          },
        },
      } as any;

      act(() => {
        result.current.handleDragEnd(mockEvent);
      });

      expect(result.current.listData.tiers['tier-1'].bookIds).toEqual(['book-1']);
    });

    it('должен перемещать книги внутри unranked', () => {
      // Добавим ещё книг в unranked для теста
      initialData.unrankedBookIds = ['book-1', 'book-2', 'book-3'];
      const { result } = renderHook(() => useTierList(initialData));

      const mockEvent = {
        active: {
          id: 'book-1',
          data: {
            current: {
              type: 'book',
              containerId: 'unranked-area',
              sortable: { index: 0 },
            },
          },
        },
        over: {
          id: 'book-2', // Перетаскиваем НА книгу book-2
          data: {
            current: {
              type: 'book',
              containerId: 'unranked-area',
              sortable: { index: 1 },
            },
          },
        },
      } as any;

      act(() => {
        result.current.handleDragEnd(mockEvent);
      });

      // arrayMove([book-1, book-2, book-3], 0, 1) = [book-2, book-1, book-3]
      expect(result.current.listData.unrankedBookIds).toEqual(['book-2', 'book-1', 'book-3']);
    });
  });

  describe('handleDragEnd - перемещение между контейнерами', () => {
    it('должен перемещать книгу из тира в unranked', () => {
      const { result } = renderHook(() => useTierList(initialData));

      const mockEvent = {
        active: {
          id: 'book-1',
          data: {
            current: {
              type: 'book',
              containerId: 'tier-1',
              sortable: { index: 0 },
            },
          },
        },
        over: {
          id: 'unranked-area',
          data: {
            current: {
              containerId: 'unranked-area',
              sortable: { index: 0 },
            },
          },
        },
      } as any;

      act(() => {
        result.current.handleDragEnd(mockEvent);
      });

      expect(result.current.listData.tiers['tier-1'].bookIds).toEqual([]);
      expect(result.current.listData.unrankedBookIds).toContain('book-1');
    });

    it('должен перемещать книгу из unranked в тир', () => {
      const { result } = renderHook(() => useTierList(initialData));

      const mockEvent = {
        active: {
          id: 'book-3',
          data: {
            current: {
              type: 'book',
              containerId: 'unranked-area',
              sortable: { index: 0 },
            },
          },
        },
        over: {
          id: 'tier-1',
          data: {
            current: {
              containerId: 'tier-1',
              sortable: { index: 1 },
            },
          },
        },
      } as any;

      act(() => {
        result.current.handleDragEnd(mockEvent);
      });

      expect(result.current.listData.unrankedBookIds).toEqual([]);
      expect(result.current.listData.tiers['tier-1'].bookIds).toEqual(['book-1', 'book-3']);
    });

    it('должен перемещать книгу между тирами', () => {
      const { result } = renderHook(() => useTierList(initialData));

      const mockEvent = {
        active: {
          id: 'book-1',
          data: {
            current: {
              type: 'book',
              containerId: 'tier-1',
              sortable: { index: 0 },
            },
          },
        },
        over: {
          id: 'tier-2',
          data: {
            current: {
              containerId: 'tier-2',
              sortable: { index: 1 },
            },
          },
        },
      } as any;

      act(() => {
        result.current.handleDragEnd(mockEvent);
      });

      expect(result.current.listData.tiers['tier-1'].bookIds).toEqual([]);
      expect(result.current.listData.tiers['tier-2'].bookIds).toEqual(['book-2', 'book-1']);
    });
  });

  describe('updateTierSettings', () => {
    it('должен обновлять настройки тира', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.updateTierSettings('tier-1', {
          title: 'S+',
          color: '#FF0000',
        });
      });

      expect(result.current.listData.tiers['tier-1'].title).toBe('S+');
      expect(result.current.listData.tiers['tier-1'].color).toBe('#FF0000');
    });

    it('не должен падать при обновлении несуществующего тира', () => {
      const { result } = renderHook(() => useTierList(initialData));

      expect(() => {
        act(() => {
          result.current.updateTierSettings('non-existent', { title: 'Test' });
        });
      }).not.toThrow();
    });
  });

  describe('addBooks', () => {
    it('должен добавлять книги из файлов', async () => {
      const { result } = renderHook(() => useTierList(initialData));

      const mockFile = new File(['test'], 'test-book.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.addBooks([mockFile]);
      });

      // Проверяем, что книга добавилась в unranked
      expect(result.current.listData.unrankedBookIds.length).toBeGreaterThan(1);
      
      // Проверяем, что книга имеет временный ID
      const newBookId = result.current.listData.unrankedBookIds.find(
        id => id.startsWith('book-')
      );
      expect(newBookId).toBeDefined();
    });
  });

  describe('deleteBook', () => {
    it('должен удалять книгу из тира', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.deleteBook('book-1');
      });

      expect(result.current.listData.tiers['tier-1'].bookIds).toEqual([]);
      expect(result.current.listData.books['book-1']).toBeUndefined();
    });

    it('должен удалять книгу из unranked', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.deleteBook('book-3');
      });

      expect(result.current.listData.unrankedBookIds).toEqual([]);
      expect(result.current.listData.books['book-3']).toBeUndefined();
    });
  });

  describe('updateBook', () => {
    it('должен обновлять информацию о книге', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.updateBook('book-1', {
          title: 'Обновлённое название',
          author: 'Новый автор',
        });
      });

      expect(result.current.listData.books['book-1'].title).toBe('Обновлённое название');
      expect(result.current.listData.books['book-1'].author).toBe('Новый автор');
    });
  });

  describe('clearRows', () => {
    it('должен удалять все тиры и перемещать книги в unranked', () => {
      const { result } = renderHook(() => useTierList(initialData));

      act(() => {
        result.current.clearRows();
      });

      expect(result.current.listData.tierOrder).toEqual([]);
      expect(Object.keys(result.current.listData.tiers).length).toBe(0);
      expect(result.current.listData.unrankedBookIds).toEqual(['book-3', 'book-1', 'book-2']);
    });
  });

  describe('replaceBookIds', () => {
    it('должен заменять временные ID книг на реальные', () => {
      const { result } = renderHook(() => useTierList(initialData));

      // Добавим книгу с временным ID
      act(() => {
        result.current.replaceBookIds([
          { tempId: 'book-1', realId: '123' },
        ]);
      });

      // Проверяем, что замена произошла
      expect(result.current.listData.books['123']).toBeDefined();
      expect(result.current.listData.books['123'].id).toBe('123');
    });
  });

  describe('replaceTierIds', () => {
    it('должен заменять временные ID тиров на реальные', () => {
      const { result } = renderHook(() => useTierList(initialData));

      // Добавим тир с временным ID
      act(() => {
        result.current.replaceTierIds([
          { tempId: 'tier-1', realId: '456' },
        ]);
      });

      // Проверяем, что замена произошла в tierOrder
      expect(result.current.listData.tierOrder).toContain('456');
      expect(result.current.listData.tiers['456']).toBeDefined();
    });
  });
});
