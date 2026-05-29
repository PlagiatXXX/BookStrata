import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TEMPLATES, type TemplateItem } from '../../data/mockData';
import { TemplateCard } from './TemplateCard';

interface TemplateGridProps {
  activeCategory: string;
  searchQuery: string;
  onPreview: (template: TemplateItem) => void;
}

export const TemplateGrid = memo(({ activeCategory, searchQuery, onPreview }: TemplateGridProps) => {
  const filteredTemplates = useMemo(
    () => {
      const query = searchQuery.toLowerCase().trim();
      return TEMPLATES.filter((t) => {
        const matchesCategory = t.categoryId === activeCategory;
        if (!query) return matchesCategory;

        const matchesQuery =
          t.title.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query);

        return matchesCategory && matchesQuery;
      });
    },
    [activeCategory, searchQuery]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[180px]">
      {filteredTemplates.length > 0 ? (
        filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={onPreview}
          />
        ))
      ) : (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col items-center justify-center p-12 text-center bg-(--bg-1) border border-dashed border-(--line-soft) rounded-md animate-fade-in">
          <p className="text-(--ink-1) font-medium mb-2">Ничего не найдено</p>
          <p className="text-xs text-(--ink-1) opacity-70">
            Попробуйте изменить запрос или категорию
          </p>
        </div>
      )}

      <div className="col-span-1 sm:col-span-2 lg:col-span-4 brutal-card brutal-border overflow-hidden reveal mt-2 md:mt-4" data-reveal>
        <div className="h-full p-8 flex flex-col justify-center items-center text-center">
          <h3 className="community-heading text-2xl font-black leading-tight mb-5 sm:text-3xl">
            Не нашли нужное?
          </h3>
          <Link
            to="/templates/new"
            className="brutal-cta px-8 py-3 text-xs font-semibold uppercase tracking-widest"
          >
            Создать свой шаблон
          </Link>
        </div>
      </div>
    </div>
  );
});
