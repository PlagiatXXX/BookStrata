import { memo, useState, useEffect, useMemo } from 'react';
import { getPublishedCollections } from '@/lib/collectionsApi';
import { CollectionCard } from './CollectionCard';
import type { CollectionItem } from '@/data/mockData';

interface CollectionGridProps {
  activeCategory: string;
  searchQuery?: string;
}

export const CollectionGrid = memo(({ activeCategory, searchQuery = "" }: CollectionGridProps) => {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getPublishedCollections()
      .then((data) => {
        if (!cancelled) {
          const curated = data.filter((c) => c.type === "curated");
          setCollections(curated);
        }
      })
      .catch(() => {
        if (!cancelled) setCollections([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filteredCollections = useMemo(() => {
    if (collections.length === 0) {
      return [];
    }

    let filtered = collections;

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.excerpt || "").toLowerCase().includes(q) ||
        (c.tags || []).some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Фильтрация по категории
    if (activeCategory && activeCategory !== "all") {
      const categoryMap: Record<string, string[]> = {
        "fantasy": ["фэнтези", "фентези"],
        "mystery": ["детектив", "детективы"],
        "sci-fi": ["sci-fi", "научная фантастика", "фантастика"],
        "classics": ["классика"],
        "non-fiction": ["нон-фикшн", "non-fiction", "документальная"],
        "fiction": ["художественная", "проза"],
        "young-adult": ["young adult", "ya", "молодёжная"],
        "historical": ["историческая", "исторический"],
        "mystical": ["мистика"],
        "contemporary": ["современная проза", "современная"],
        "cyberpunk": ["киберпанк"],
        "horror": ["хоррор", "ужасы"],
        "romance": ["любовный", "романтика"],
        "slavic-fantasy": ["славянское фэнтези", "славянская"],
        "adventure": ["приключения"],
        "thriller": ["триллер"],
        "dystopia": ["антиутопия"],
        "japanese": ["японская"],
        "russian-classics": ["русская классика"],
        "foreign-prose": ["зарубежная"],
        "philosophical": ["философский"],
        "military": ["военная"],
        "magical-realism": ["магический реализм"],
        "urban-fantasy": ["городское фэнтези"],
        "myths": ["сказки", "мифы"],
      };

      const keywords = categoryMap[activeCategory];
      if (keywords) {
        filtered = filtered.filter((c) => {
          const searchText = `${c.title} ${c.excerpt || ""} ${c.tags?.join(" ") || ""}`.toLowerCase();
          return keywords.some((kw) => searchText.includes(kw));
        });
      }
    }

    return filtered;
  }, [collections, activeCategory, searchQuery]);

  if (loading) {
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
