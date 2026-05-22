/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import {
  templateLibraryReducer,
  initialState,
  type TemplateLibraryState,
  type TemplateLibraryAction,
} from './templateLibraryReducer';

describe('templateLibraryReducer', () => {
  describe('initialState', () => {
    it('должен иметь правильные начальные значения', () => {
      expect(initialState).toEqual({
        activeSection: 'private',
        publicPage: 1,
      });
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
      expect(newState.publicPage).toBe(3);
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

  describe('неизвестное действие', () => {
    it('должен возвращать состояние без изменений', () => {
      const state: TemplateLibraryState = {
        ...initialState,
        publicPage: 3,
      };

      // @ts-expect-error - намеренно передаём неизвестное действие
      const newState = templateLibraryReducer(state, { type: 'UNKNOWN_ACTION' });

      expect(newState).toBe(state);
    });
  });
});
