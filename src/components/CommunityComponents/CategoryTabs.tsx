import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '@/data/mockData';

const SCROLL_AMOUNT = 240;

interface CategoryTabsProps {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
}

export const CategoryTabs = memo(({ activeCategory, setActiveCategory }: CategoryTabsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT, behavior: 'smooth' });
  }, []);

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
    <section className="mb-12 reveal relative group" data-reveal>
      {/* Левая стрелка */}
      <button
        type="button"
        aria-label="Прокрутить влево"
        onClick={() => scrollBy('left')}
        className={`absolute left-0 top-0 bottom-4 z-10 flex items-center justify-center w-8 bg-linear-to-r from-(--bg-0) via-(--bg-0)/90 to-transparent cursor-pointer transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronLeft size={18} className="text-(--ink-1)" />
      </button>

      {/* Контейнер с табами */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar px-8"
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

      {/* Правая стрелка */}
      <button
        type="button"
        aria-label="Прокрутить вправо"
        onClick={() => scrollBy('right')}
        className={`absolute right-0 top-0 bottom-4 z-10 flex items-center justify-center w-8 bg-linear-to-l from-(--bg-0) via-(--bg-0)/90 to-transparent cursor-pointer transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronRight size={18} className="text-(--ink-1)" />
      </button>
    </section>
  );
});
