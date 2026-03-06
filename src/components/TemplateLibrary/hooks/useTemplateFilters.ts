import { useMemo } from 'react';
import type { Template } from '../../../types/templates';
import type { SectionKey } from '../templateLibraryReducer';

interface UseTemplateFiltersOptions {
  templates: Template[] | undefined;
  activeSection: SectionKey;
  activeCategory: string;
  searchQuery: string;
}

interface UseTemplateFiltersReturn {
  filteredTemplates: Template[];
  categories: string[];
}

/**
 * Хук для фильтрации шаблонов
 * Обрабатывает поиск, категории и секции
 */
export function useTemplateFilters({
  templates,
  activeSection,
  activeCategory,
  searchQuery,
}: UseTemplateFiltersOptions): UseTemplateFiltersReturn {
  // Извлекаем уникальные категории из шаблонов
  const categories = useMemo(() => {
    const set = new Set<string>();
    (templates || []).forEach((template) => {
      if (template.category?.trim()) set.add(template.category);
    });
    return Array.from(set).sort();
  }, [templates]);

  // Фильтруем шаблоны по параметрам
  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return (templates || []).filter((template) => {
      // Фильтрация по секции
      if (activeSection === 'private') {
        if (template.isArchived) return false;
      }
      if (activeSection === 'favorites' && !template.isFavorite) return false;
      if (activeSection === 'archived' && !template.isArchived) return false;
      if (activeSection === 'public') return false;

      // Фильтрация по категории
      if (activeCategory !== 'all' && template.category !== activeCategory) {
        return false;
      }

      // Поиск по названию и описанию
      if (!normalizedSearch) return true;

      const title = template.title.toLowerCase();
      const description = (template.description || '').toLowerCase();

      return (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [templates, activeSection, activeCategory, searchQuery]);

  return {
    filteredTemplates,
    categories,
  };
}
