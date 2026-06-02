/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTierEditorDrag } from './useTierEditorDrag';
import type { TierListData } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';

// Мокаем logger
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

// Мокаем html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}));

// Получаем моки после vi.mock
const mockToPng = vi.mocked(await import('html-to-image')).toPng;

const createMockTierListData = (): TierListData => ({
  id: 'test-list-1',
  title: 'Test List',
  books: {
    'book-1': {
      id: 'book-1',
      title: 'Book 1',
      author: 'Author 1',
      coverImageUrl: 'http://example.com/cover1.jpg',
    },
    'book-2': {
      id: 'book-2',
      title: 'Book 2',
      author: 'Author 2',
      coverImageUrl: 'http://example.com/cover2.jpg',
    },
  },
  tiers: {
    'tier-1': {
      id: 'tier-1',
      title: 'S',
      color: '#FF6B6B',
      bookIds: ['book-1'],
    },
  },
  tierOrder: ['tier-1'],
  unrankedBookIds: ['book-2'],
  tierIdToTempIdMap: {},
});

describe('useTierEditorDrag', () => {
  const mockListData = createMockTierListData();
  const mockSetActiveItem = vi.fn();
  const mockHandleDragEndWithUnsaved = vi.fn();

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Инициализация', () => {
    it('должен возвращать tierGridRef', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      expect(result.current.tierGridRef).toBeDefined();
      expect(result.current.tierGridRef.current).toBeNull();
    });

    it('должен возвращать handleDragStart', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      expect(result.current.handleDragStart).toBeDefined();
      expect(typeof result.current.handleDragStart).toBe('function');
    });

    it('должен возвращать handleDragEndAndClear', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      expect(result.current.handleDragEndAndClear).toBeDefined();
      expect(typeof result.current.handleDragEndAndClear).toBe('function');
    });

    it('должен возвращать onDownloadImage', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      expect(result.current.onDownloadImage).toBeDefined();
      expect(typeof result.current.onDownloadImage).toBe('function');
    });
  });

  describe('handleDragStart', () => {
    it('должен устанавливать activeItem для книги', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      const mockEvent = {
        active: {
          id: 'book-1',
          data: {
            current: {
              type: 'book',
            },
          },
        },
      } as unknown as DragEndEvent;

      result.current.handleDragStart(mockEvent);

      expect(mockSetActiveItem).toHaveBeenCalledWith(mockListData.books['book-1']);
    });

    it('должен устанавливать activeItem для тира', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      const mockEvent = {
        active: {
          id: 'tier-1',
          data: {
            current: {
              type: 'tier',
            },
          },
        },
      } as unknown as DragEndEvent;

      result.current.handleDragStart(mockEvent);

      expect(mockSetActiveItem).toHaveBeenCalledWith(mockListData.tiers['tier-1']);
    });

    it('должен устанавливать null если книга не найдена', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      const mockEvent = {
        active: {
          id: 'non-existent-book',
          data: {
            current: {
              type: 'book',
            },
          },
        },
      } as unknown as DragEndEvent;

      result.current.handleDragStart(mockEvent);

      expect(mockSetActiveItem).toHaveBeenCalledWith(null);
    });

    it('должен устанавливать null если тир не найден', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      const mockEvent = {
        active: {
          id: 'non-existent-tier',
          data: {
            current: {
              type: 'tier',
            },
          },
        },
      } as unknown as DragEndEvent;

      result.current.handleDragStart(mockEvent);

      expect(mockSetActiveItem).toHaveBeenCalledWith(null);
    });
  });

  describe('handleDragEndAndClear', () => {
    it('должен вызывать handleDragEndWithUnsaved и сбрасывать activeItem', () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      const mockEvent = {
        active: {
          id: 'book-1',
        },
        over: {
          id: 'tier-1',
        },
      } as DragEndEvent;

      result.current.handleDragEndAndClear(mockEvent);

      expect(mockHandleDragEndWithUnsaved).toHaveBeenCalledWith(mockEvent);
      expect(mockSetActiveItem).toHaveBeenCalledWith(null);
    });
  });

  describe('onDownloadImage', () => {
    function renderHookWithRef() {
      const hook = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );
      const mockElement = document.createElement('div');
      hook.result.current.tierGridRef.current = mockElement;
      return hook;
    }

    it('должен ничего не делать если tierGridRef.current = null', async () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      await result.current.onDownloadImage();

      // tierGridRef.current = null по умолчанию - ничего не происходит
    });

    it('должен скачивать изображение если tierGridRef.current существует', async () => {
      const { result } = renderHook(() =>
        useTierEditorDrag({
          listData: mockListData,
          setActiveItem: mockSetActiveItem,
          handleDragEndWithUnsaved: mockHandleDragEndWithUnsaved,
        })
      );

      // Устанавливаем mock элемент
      const mockElement = document.createElement('div');
      result.current.tierGridRef.current = mockElement;

      await result.current.onDownloadImage();

      expect(mockToPng).toHaveBeenCalledWith(mockElement, expect.any(Object));
    });

    it('должен инлайнить background-image через fetch перед toPng', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHookWithRef();
      const el = result.current.tierGridRef.current!;

      // Добавляем книгу с background-image
      const card = document.createElement('div');
      card.className = 'nb-book-card';
      card.style.backgroundImage = 'url(http://example.com/cover.jpg)';
      el.appendChild(card);

      const originalBg = card.style.backgroundImage;

      await result.current.onDownloadImage();

      // fetch был вызван
      expect(globalThis.fetch).toHaveBeenCalledWith('http://example.com/cover.jpg', { mode: 'cors' });

      // После экспорта background-image восстановлен
      expect(card.style.backgroundImage).toBe(originalBg);

      // toPng вызван
      expect(mockToPng).toHaveBeenCalled();
    });

    it('должен пропускать data: URL и не вызывать fetch', async () => {
      globalThis.fetch = vi.fn();

      const { result } = renderHookWithRef();
      const el = result.current.tierGridRef.current!;

      const card = document.createElement('div');
      card.className = 'nb-book-card';
      card.style.backgroundImage = 'url(data:image/png;base64,abc123)';
      el.appendChild(card);

      await result.current.onDownloadImage();

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(mockToPng).toHaveBeenCalled();
    });

    it('должен обрабатывать ошибку fetch (сервер без CORS) и продолжать', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('CORS error'));

      const { result } = renderHookWithRef();
      const el = result.current.tierGridRef.current!;

      const card = document.createElement('div');
      card.className = 'nb-book-card';
      card.style.backgroundImage = 'url(http://example.com/nocors.jpg)';
      el.appendChild(card);

      await result.current.onDownloadImage();

      // toPng всё равно вызван, несмотря на ошибку CORS
      expect(mockToPng).toHaveBeenCalled();
      // background-image не изменился
      expect(card.style.backgroundImage).toContain('http://example.com/nocors.jpg');
    });

    it('должен обрабатывать ошибку при скачивании и восстанавливать стили', async () => {
      mockToPng.mockRejectedValue(new Error('Download failed'));

      const { result } = renderHookWithRef();
      const el = result.current.tierGridRef.current!;

      const card = document.createElement('div');
      card.className = 'nb-book-card';
      card.style.backgroundImage = 'url(http://example.com/cover.jpg)';
      el.appendChild(card);

      await result.current.onDownloadImage();

      // Стили восстановлены даже при ошибке
      expect(card.style.backgroundImage).toContain('http://example.com/cover.jpg');
    });

    it('должен восстанавливать background-image после экспорта', async () => {
      const mockBlob = new Blob(['fake'], { type: 'image/jpeg' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHookWithRef();
      const el = result.current.tierGridRef.current!;

      const card = document.createElement('div');
      card.className = 'nb-book-card';
      card.style.backgroundImage = 'url(http://example.com/cover.jpg)';
      el.appendChild(card);

      await result.current.onDownloadImage();

      // После экспорта — оригинальный URL
      expect(card.style.backgroundImage).toBe('url("http://example.com/cover.jpg")');
    });
  });
});
