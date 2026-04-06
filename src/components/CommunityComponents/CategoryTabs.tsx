import { memo } from 'react';
import { CATEGORIES } from '../../data/mockData';

interface CategoryTabsProps {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
}

export const CategoryTabs = memo(({ activeCategory, setActiveCategory }: CategoryTabsProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = CATEGORIES.findIndex((c) => c.id === activeCategory);
    let nextIndex = -1;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % CATEGORIES.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = CATEGORIES.length - 1;

    if (nextIndex !== -1) {
      e.preventDefault();
      setActiveCategory(CATEGORIES[nextIndex].id);
      setTimeout(() => document.getElementById(`tab-${CATEGORIES[nextIndex].id}`)?.focus(), 0);
    }
  };
  return (
    <section className="mb-12 reveal" data-reveal>
      
      <div 
        className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar"
        role="tablist"
        aria-label="Категории контента"
        onKeyDown={handleKeyDown}
      >
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            role="tab"
            tabIndex={activeCategory === category.id ? 0 : -1}
            aria-selected={activeCategory === category.id}
            aria-controls={`panel-${category.id}`}
            id={`tab-${category.id}`}
            onClick={() => setActiveCategory(category.id)}
            className={`shrink-0 px-4 py-2 rounded-md border text-xs font-semibold uppercase tracking-[0.12em] transition-colors flex items-center gap-2 cursor-pointer ${
              activeCategory === category.id
                ? 'bg-(--ink-0) text-(--bg-0) border-(--line-strong)'
                : 'bg-(--bg-1) text-(--ink-1) border-(--line-soft) hover:border-(--line-strong) hover:text-(--ink-0)'
            }`}
          >
            <category.icon size={15} />
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
});
