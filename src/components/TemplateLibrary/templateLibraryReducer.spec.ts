/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import {
  templateLibraryReducer,
  initialState,
  type TemplateLibraryState,
  type TemplateLibraryAction,
} from './templateLibraryReducer';
import type { Template } from '../../types/templates';

describe('templateLibraryReducer', () => {
  const mockTemplate: Template = {
    id: 'template-1',
    title: 'Test Template',
    description: 'Test Description',
    tiers: [{ id: 'tier-1', name: 'S', color: '#ff0000', order: 0 }],
    defaultBooks: [],
    category: 'Fantasy',
    isPublic: true,
    isFavorite: false,
    isArchived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('initialState', () => {
    it('должен иметь правильные начальные значения', () => {
      expect(initialState).toEqual({
        searchQuery: '',
        deleteModalOpen: false,
        templateToDelete: null,
        activeSection: 'private',
        activeCategory: 'all',
        viewMode: 'masonry',
        publicPage: 1,
      });
    });
  });

  describe('SET_SEARCH_QUERY', () => {
    it('должен обновлять searchQuery', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        searchQuery: 'old query',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_SEARCH_QUERY',
        payload: 'new query',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.searchQuery).toBe('new query');
      // Остальные поля не изменились
      expect(newState.activeSection).toBe(state.activeSection);
      expect(newState.publicPage).toBe(state.publicPage);
    });
  });

  describe('OPEN_DELETE_MODAL', () => {
    it('должен открывать модальное окно и устанавливать templateToDelete', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        deleteModalOpen: false,
        templateToDelete: null,
      };

      const action: TemplateLibraryAction = {
        type: 'OPEN_DELETE_MODAL',
        payload: mockTemplate,
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.deleteModalOpen).toBe(true);
      expect(newState.templateToDelete).toBe(mockTemplate);
    });
  });

  describe('CLOSE_DELETE_MODAL', () => {
    it('должен закрывать модальное окно и сбрасывать templateToDelete', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        deleteModalOpen: true,
        templateToDelete: mockTemplate,
      };

      const action: TemplateLibraryAction = {
        type: 'CLOSE_DELETE_MODAL',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.deleteModalOpen).toBe(false);
      expect(newState.templateToDelete).toBeNull();
    });
  });

  describe('SET_ACTIVE_SECTION', () => {
    it('должен обновлять activeSection', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        activeSection: 'private',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: 'public',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.activeSection).toBe('public');
    });

    it('должен сбрасывать publicPage в 1 при переключении на public', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        activeSection: 'private',
        publicPage: 5,
      };

      const action: TemplateLibraryAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: 'public',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.activeSection).toBe('public');
      expect(newState.publicPage).toBe(1);
    });

    it('не должен сбрасывать publicPage при переключении на не-public', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        activeSection: 'favorites',
        publicPage: 3,
      };

      const action: TemplateLibraryAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: 'private',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.activeSection).toBe('private');
      expect(newState.publicPage).toBe(3); // Сохранено
    });

    it('должен переключать на favorites', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        activeSection: 'private',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: 'favorites',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.activeSection).toBe('favorites');
    });

    it('должен переключать на archived', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        activeSection: 'private',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: 'archived',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.activeSection).toBe('archived');
    });
  });

  describe('SET_ACTIVE_CATEGORY', () => {
    it('должен обновлять activeCategory', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        activeCategory: 'all',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_ACTIVE_CATEGORY',
        payload: 'Fantasy',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.activeCategory).toBe('Fantasy');
    });
  });

  describe('SET_VIEW_MODE', () => {
    it('должен переключать на masonry', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        viewMode: 'compact',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_VIEW_MODE',
        payload: 'masonry',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.viewMode).toBe('masonry');
    });

    it('должен переключать на compact', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        viewMode: 'masonry',
      };

      const action: TemplateLibraryAction = {
        type: 'SET_VIEW_MODE',
        payload: 'compact',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.viewMode).toBe('compact');
    });
  });

  describe('SET_PUBLIC_PAGE', () => {
    it('должен обновлять publicPage', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        publicPage: 1,
      };

      const action: TemplateLibraryAction = {
        type: 'SET_PUBLIC_PAGE',
        payload: 5,
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.publicPage).toBe(5);
    });

    it('должен позволять устанавливать страницу 1', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        publicPage: 10,
      };

      const action: TemplateLibraryAction = {
        type: 'SET_PUBLIC_PAGE',
        payload: 1,
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.publicPage).toBe(1);
    });
  });

  describe('RESET_PUBLIC_PAGE', () => {
    it('должен сбрасывать publicPage в 1', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        publicPage: 7,
      };

      const action: TemplateLibraryAction = {
        type: 'RESET_PUBLIC_PAGE',
      };

      const newState = templateLibraryReducer(state, action);

      expect(newState.publicPage).toBe(1);
    });
  });

  describe('неизвестное действие', () => {
    it('должен возвращать состояние без изменений', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        searchQuery: 'test',
        publicPage: 3,
      };

      // @ts-expect-error - намеренно передаём неизвестное действие
      const newState = templateLibraryReducer(state, { type: 'UNKNOWN_ACTION' });

      expect(newState).toBe(state); // Тот же объект (без изменений)
    });
  });

  describe('комбинация действий', () => {
    it('должен корректно обрабатывать последовательность действий', () => {
      let state: TemplateLibraryState = initialState;

      // Пользователь ищет книгу
      state = templateLibraryReducer(state, {
        type: 'SET_SEARCH_QUERY',
        payload: 'Harry Potter',
      });

      // Переключается на публичные
      state = templateLibraryReducer(state, {
        type: 'SET_ACTIVE_SECTION',
        payload: 'public',
      });

      // Переходит на страницу 3
      state = templateLibraryReducer(state, {
        type: 'SET_PUBLIC_PAGE',
        payload: 3,
      });

      // Переключается обратно на личные
      state = templateLibraryReducer(state, {
        type: 'SET_ACTIVE_SECTION',
        payload: 'private',
      });

      expect(state.searchQuery).toBe('Harry Potter');
      expect(state.activeSection).toBe('private');
      expect(state.publicPage).toBe(3); // Страница сохранилась
      expect(state.activeCategory).toBe('all');
    });
  });
});
