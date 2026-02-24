import { Link } from 'react-router-dom';
import { TEMPLATES, type TemplateItem } from '../../data/mockData';
import { TemplateCard } from './TemplateCard';

interface TemplateGridProps {
  activeCategory: string;
  applyingTemplateId: number | null;
  onUseTemplate: (template: TemplateItem) => void;
}

export const TemplateGrid = ({ activeCategory, applyingTemplateId, onUseTemplate }: TemplateGridProps) => {
  const filteredTemplates = TEMPLATES.filter((t) => t.categoryId === activeCategory);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[180px]">
      {filteredTemplates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isApplying={applyingTemplateId === template.id}
          onUseTemplate={onUseTemplate}
        />
      ))}

      <div className="col-span-1 sm:col-span-2 lg:col-span-4 brutal-card brutal-border overflow-hidden reveal mt-2 md:mt-4" data-reveal>
        <div className="h-full p-8 flex flex-col justify-center items-center text-center">
          <h3 className="community-heading text-3xl font-black leading-tight mb-5">
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
};
