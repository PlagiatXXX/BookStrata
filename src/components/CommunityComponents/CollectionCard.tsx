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

const FALLBACK = '/images/placeholder.svg';

export const CollectionCard = memo(({ collection }: CollectionCardProps) => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate(`/collections/${collection.slug}`);
  }, [navigate, collection.slug]);

  // Первые 3 обложки для превью
  const previewCovers = (collection.bookCovers || []).slice(0, 3);
  const hasCovers = previewCovers.length > 0;

  return (
    <div
      className={`group relative overflow-hidden brutal-card brutal-border border-l-4 transition-all duration-300 hover-lift ${getGridClass(collection.id)}`}
      style={{ borderLeftColor: 'var(--accent-main)' } as CSSProperties}
    >
      {/* Фон — тёмный градиент */}
      <div className="absolute inset-0 bg-linear-to-br from-(--bg-1) via-(--bg-0) to-(--bg-2)" />

      {/* Превью обложек — сетка 3 шт */}
      {hasCovers && (
        <div className="absolute top-3 right-3 flex gap-1">
          {previewCovers.map((url, idx) => (
            <div
              key={idx}
              className="w-12 h-18 rounded-sm overflow-hidden border border-white/10 shadow-lg ring-1 ring-black/20"
              style={{ transform: `rotate(${idx === 0 ? '-3deg' : idx === 2 ? '3deg' : '0deg'})` }}
            >
              <img
                alt=""
                className="w-full h-full object-cover"
                src={proxyImageUrl(url)}
                onError={(e) => { e.currentTarget.src = FALLBACK }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Контент внизу */}
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-transparent p-6 flex flex-col justify-end">
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

      {/* Оверлей при наведении */}
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
