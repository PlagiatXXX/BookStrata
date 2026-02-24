import { CATEGORIES } from '../../data/mockData';

interface CategoryTabsProps {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
}

export const CategoryTabs = ({ activeCategory, setActiveCategory }: CategoryTabsProps) => {
  return (
    <section className="mb-12 reveal" data-reveal>
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
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
};
