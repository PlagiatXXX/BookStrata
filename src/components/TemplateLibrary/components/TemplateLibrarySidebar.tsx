import { memo } from 'react';
import { Globe, Lock, Star } from 'lucide-react';
import type { TemplateLibrarySidebarProps } from '../types';
import { SECTION_LABELS } from '../constants';

export const TemplateLibrarySidebar = memo(({
  activeSection,
  activeCategory,
  categories,
  onSectionChange,
  onCategoryChange,
}: TemplateLibrarySidebarProps) => {
  const sections: Array<{ key: TemplateLibrarySidebarProps['activeSection']; icon: typeof Lock }> = [
    { key: 'private', icon: Lock },
    { key: 'public', icon: Globe },
    { key: 'favorites', icon: Star },
  ];

  return (
    <aside className="rounded-2xl border border-[#0b3f52]/70 bg-[#071f2b]/85 p-4 lg:sticky lg:top-22 lg:h-fit">
      {/* Навигация по секциям */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
        Библиотека
      </p>
      <div className="space-y-2">
        {sections.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSectionChange(key)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              activeSection === key
                ? 'bg-cyan-500/25 text-cyan-100'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={14} /> {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Категории */}
      {categories.length > 0 && activeSection !== 'public' && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/70">
            Категории
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCategoryChange('all')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-cyan-500/25 text-cyan-100'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              Все
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-cyan-500/25 text-cyan-100'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
});
