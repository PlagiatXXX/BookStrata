import { memo, type CSSProperties } from 'react';
import type { TemplateItem } from '../../data/mockData';

interface TemplateCardProps {
  template: TemplateItem;
  onPreview: (template: TemplateItem) => void;
}

const getGridClass = (size: string) => {
  const map: Record<string, string> = {
    large: 'sm:col-span-2 sm:row-span-2',
    tall: 'sm:row-span-2',
    wide: 'sm:col-span-2',
    standard: '',
  };
  return map[size] || '';
};

export const TemplateCard = memo(({ template, onPreview }: TemplateCardProps) => {
  const borderColorStyle = template.borderColor.startsWith('#')
    ? template.borderColor
    : `var(--${template.borderColor})`;

  return (
    <div
      className={`group relative overflow-hidden brutal-card brutal-border border-l-4 transition-all duration-300 reveal hover-lift ${getGridClass(template.size)}`}
      style={{ borderLeftColor: borderColorStyle } as CSSProperties}
      data-reveal
    >
      <img
        alt={template.title}
        className="absolute inset-0 w-full h-full object-cover opacity-45 transition-all duration-500 group-hover:opacity-60 parallax-img"
        src={template.image}
        onError={(e) => { e.currentTarget.src = '/images/placeholder.svg' }}
      />

      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-6 flex flex-col justify-end">
        {template.badge && (
          <span className="brutal-label text-[10px] font-semibold uppercase px-2 py-0.5 mb-2 w-fit">
            {template.badge.text}
          </span>
        )}
        <h3 className={`${template.size === 'large' || template.size === 'tall' ? 'text-2xl md:text-3xl' : 'text-lg'} community-heading font-extrabold leading-none mb-1`}>
          {template.title}
        </h3>
        <p className="text-(--ink-1) text-sm">
          {template.category}
        </p>
      </div>

      <div className="absolute inset-0 bg-[rgba(18,18,18,0.62)] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
        <button
          className="brutal-cta px-4 py-2 md:px-6 md:py-3 text-xs font-semibold uppercase tracking-widest cursor-pointer"
          aria-label={`Посмотреть шаблон: ${template.title}`}
          onClick={() => onPreview(template)}
        >
          Посмотреть
        </button>
      </div>
    </div>
  );
});
