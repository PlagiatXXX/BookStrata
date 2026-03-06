/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTemplateFilters } from './useTemplateFilters';
import type { Template } from '../../../types/templates';

const mockTemplates: Template[] = [
  {
    id: 'template-1',
    title: 'Fantasy Books',
    description: 'Best fantasy novels',
    tiers: [{ id: 'tier-1', name: 'S', color: '#ff0000', order: 0 }],
    defaultBooks: [],
    category: 'Fantasy',
    isPublic: true,
    isFavorite: false,
    isArchived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-2',
    title: 'Sci-Fi Collection',
    description: 'Science fiction books',
    tiers: [{ id: 'tier-1', name: 'A', color: '#00ff00', order: 0 }],
    defaultBooks: [],
    category: 'Sci-Fi',
    isPublic: true,
    isFavorite: true,
    isArchived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-3',
    title: 'Archived Template',
    description: 'Old template',
    tiers: [{ id: 'tier-1', name: 'B', color: '#0000ff', order: 0 }],
    defaultBooks: [],
    category: 'Fantasy',
    isPublic: false,
    isFavorite: false,
    isArchived: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('useTemplateFilters', () => {
  describe('categories', () => {
    it('должен извлекать уникальные категории из шаблонов', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.categories).toEqual(['Fantasy', 'Sci-Fi']);
    });

    it('должен возвращать пустой массив если нет шаблонов', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: [],
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.categories).toEqual([]);
    });

    it('должен сортировать категории по алфавиту', () => {
      const templatesWithCategories: Template[] = [
        { ...mockTemplates[0], category: 'Zebra' },
        { ...mockTemplates[1], category: 'Alpha' },
        { ...mockTemplates[2], category: 'Beta' },
      ];

      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: templatesWithCategories,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.categories).toEqual(['Alpha', 'Beta', 'Zebra']);
    });
  });

  describe('фильтрация по секциям', () => {
    it('должен показывать все неархивные шаблоны в секции private', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(2);
      expect(result.current.filteredTemplates.map(t => t.id)).not.toContain('template-3');
    });

    it('должен показывать только избранные в секции favorites', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'favorites',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
      expect(result.current.filteredTemplates[0].id).toBe('template-2');
    });

    it('должен показывать только архивные в секции archived', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'archived',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
      expect(result.current.filteredTemplates[0].id).toBe('template-3');
    });

    it('должен возвращать пустой массив для секции public', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'public',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(0);
    });
  });

  describe('фильтрация по категориям', () => {
    it('должен показывать все шаблоны при категории "all"', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(2);
    });

    it('должен фильтровать по конкретной категории', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'Fantasy',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
      expect(result.current.filteredTemplates[0].category).toBe('Fantasy');
    });
  });

  describe('поиск', () => {
    it('должен искать по названию', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: 'Fantasy',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
      expect(result.current.filteredTemplates[0].id).toBe('template-1');
    });

    it('должен искать по описанию', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: 'science fiction',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
      expect(result.current.filteredTemplates[0].id).toBe('template-2');
    });

    it('должен игнорировать регистр при поиске', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: 'fantasy',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
    });

    it('должен возвращать пустой массив если ничего не найдено', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'all',
          searchQuery: 'NonExistent',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(0);
    });
  });

  describe('комбинированная фильтрация', () => {
    it('должен корректно фильтровать по секции и категории одновременно', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'private',
          activeCategory: 'Sci-Fi',
          searchQuery: '',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
      expect(result.current.filteredTemplates[0].id).toBe('template-2');
    });

    it('должен корректно фильтровать по секции и поиску одновременно', () => {
      const { result } = renderHook(() =>
        useTemplateFilters({
          templates: mockTemplates,
          activeSection: 'favorites',
          activeCategory: 'all',
          searchQuery: 'Sci-Fi',
        })
      );

      expect(result.current.filteredTemplates).toHaveLength(1);
    });
  });
});
