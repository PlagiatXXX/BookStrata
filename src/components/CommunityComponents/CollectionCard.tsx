import { memo, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CollectionItem } from '@/data/mockData';
import { proxyImageUrl } from '@/utils/imageProxy';

interface CollectionCardProps {
  collection: CollectionItem;
  className?: string;
}

const getGridClass = (index: number): string => {
  // Чередуем размеры для визуального интереса
  const patterns = ['standard', 'tall', 'standard', 'large', 'standard', 'wide', 'standard'];
  const size = patterns[index % patterns.length];
  const map: Record<string, string> = {
    large: 'sm:col-span-2 sm:row-span-2',
    tall: 'sm:row-span-2',
    wide: 'sm:col-span-2',
    standard: '',
  };
  return map[size] || '';
};

const FALLBACK = '/images/placeholder.svg';

const DEFAULT_ACCENT = 'var(--accent-main)';

export const CollectionCard = memo(({ collection, className = '' }: CollectionCardProps) => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate(`/collections/${collection.slug}`);
  }, [navigate, collection.slug]);

  // Первые 3 обложки для превью
  const previewCovers = (collection.bookCovers || []).slice(0, 3);
  const hasCovers = previewCovers.length > 0;

  // Акцентный цвет: из коллекции или fallback
  const accentColor = collection.accentColor || DEFAULT_ACCENT;

  return (
    <div
      className={`group relative overflow-hidden brutal-card brutal-border border-l-4 transition-all duration-300 hover-lift min-h-[200px] ${getGridClass(collection.id)} ${className}`}
      style={{ borderLeftColor: accentColor } as CSSProperties}
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
        <h3 className="community-heading font-extrabold leading-none mb-1 text-lg md:text-xl">
          {collection.title}
        </h3>
        {collection.excerpt && (
          <p className="text-(--ink-1) text-sm line-clamp-2">
            {collection.excerpt}
          </p>
        )}
      </div>

      {/* Оверлей при наведении — на мобильных без затемнения, кнопка в углу */}
      <div className="absolute inset-0 md:bg-[rgba(18,18,18,0.62)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity md:flex md:items-center md:justify-center">
        <button
          className="absolute bottom-2 right-2 md:static brutal-cta px-2 py-1 md:px-6 md:py-3 text-[10px] md:text-xs font-semibold uppercase tracking-widest cursor-pointer"
          aria-label={`Посмотреть подборку: ${collection.title}`}
          onClick={handleClick}
        >
          Посмотреть&nbsp;→
        </button>
      </div>
    </div>
  );
});
