import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCommunityCollections } from '@/lib/collectionsApi';
import { CollectionCard } from './CollectionCard';

interface CollectionGridProps {
  activeCategory: string;
  searchQuery?: string;
}

export const CollectionGrid = memo(({ activeCategory, searchQuery = "" }: CollectionGridProps) => {
  const {
    data: collections = [],
    isLoading,
  } = useQuery({
    queryKey: ["published-collections"],
    queryFn: getCommunityCollections,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const filteredCollections = useMemo(() => {
    const curated = collections.filter((c) => c.type === "curated");
    if (curated.length === 0) {
      return [];
    }

    let filtered = curated;

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.excerpt || "").toLowerCase().includes(q) ||
        (c.tags || []).some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Фильтрация по категории (прямое поле categoryId)
    if (activeCategory && activeCategory !== "all") {
      filtered = filtered.filter((c) => c.categoryId === activeCategory);
    }

    return filtered;
  }, [collections, activeCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[180px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="brutal-card brutal-border animate-pulse bg-(--bg-1)" />
        ))}
      </div>
    );
  }

  if (filteredCollections.length === 0) {
    return (
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col items-center justify-center p-12 text-center bg-(--bg-1) border border-dashed border-(--line-soft) rounded-md animate-fade-in">
        <p className="text-(--ink-1) font-medium mb-2">Подборок пока нет</p>
        <p className="text-xs text-(--ink-1) opacity-70">
          В этой категории пока нет подборок, но они скоро появятся
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[180px]">
      {filteredCollections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
        />
      ))}
    </div>
  );
});
