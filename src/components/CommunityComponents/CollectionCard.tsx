import { memo, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CollectionItem } from '@/data/mockData';
import { proxyImageUrl } from '@/utils/imageProxy';

interface CollectionCardProps {
  collection: CollectionItem;
}

const getGridClass = (index: number): string => {
  // Чередуем размеры для визуального интереса
  const patterns = ['standard', 'tall', 'standard', 'large', 'standard', 'wide', 'standard'];
  const size = patterns[index % patterns.length];
  const map: Record<string, string> = {
    large: 'col-span-2 row-span-2',
    tall: 'row-span-2',
    wide: 'col-span-2',
    standard: '',
  };
  return map[size] || '';
};

export const CollectionCard = memo(({ collection }: CollectionCardProps) => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate(`/collections/${collection.slug}`);
  }, [navigate, collection.slug]);

  return (
    <div
      className={`group relative overflow-hidden brutal-card brutal-border border-l-4 transition-all duration-300 reveal hover-lift ${getGridClass(collection.id)}`}
      style={{ borderLeftColor: 'var(--accent-main)' } as CSSProperties}
      data-reveal
    >
      <img
        alt={collection.title}
        className="absolute inset-0 w-full h-full object-cover opacity-45 transition-all duration-500 group-hover:opacity-60 parallax-img"
        src={proxyImageUrl(collection.coverImageUrl)}
        onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
      />

      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-6 flex flex-col justify-end">
        <span className="brutal-label text-[10px] font-semibold uppercase px-2 py-0.5 mb-2 w-fit bg-accent-main/20 text-accent-main border-accent-main/30">
          Подборка BookStrata
        </span>
        <h3 className="community-heading font-extrabold leading-none mb-1 text-xl md:text-2xl">
          {collection.title}
        </h3>
        {collection.excerpt && (
          <p className="text-(--ink-1) text-sm line-clamp-2">
            {collection.excerpt}
          </p>
        )}
      </div>

      <div className="absolute inset-0 bg-[rgba(18,18,18,0.62)] opacity-0 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
        <button
          className="brutal-cta px-4 py-2 md:px-6 md:py-3 text-xs font-semibold uppercase tracking-widest cursor-pointer"
          aria-label={`Посмотреть подборку: ${collection.title}`}
          onClick={handleClick}
        >
          Посмотреть
        </button>
      </div>
    </div>
  );
});
