import { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { CollectionItem } from '@/data/mockData';
import { proxyImageUrl } from '@/utils/imageProxy';

interface CollectionCardProps {
  collection: CollectionItem;
  className?: string;
}

const FALLBACK = '/images/placeholder.svg';

const DEFAULT_ACCENT = 'var(--accent-main)';

export const CollectionCard = memo(({ collection, className = '' }: CollectionCardProps) => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate(`/collections/${collection.slug}`);
  }, [navigate, collection.slug]);

  // Приоритет: coverImageUrl коллекции → первая обложка книги → null
  const coverImage = collection.coverImageUrl || collection.bookCovers?.[0] || null;
  const accentColor = collection.accentColor || DEFAULT_ACCENT;

  // Реальное количество книг в коллекции
  const booksCount = useMemo(
    () => Object.keys(collection.books || {}).length,
    [collection.books],
  );

  const initial = useMemo(
    () => collection.title.charAt(0).toUpperCase(),
    [collection.title],
  );

  return (
    <article
      className={`group relative overflow-hidden rounded-sm transition-all duration-300 cursor-pointer min-h-[200px] ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-label={`Подборка: ${collection.title}`}
    >
      {/* ===== Фон: обложка или градиент ===== */}
      {coverImage ? (
        <div className="absolute inset-0">
          <img
            alt=""
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
            src={proxyImageUrl(coverImage)}
            onError={(e) => { e.currentTarget.src = FALLBACK; }}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }}
        >
          <span className="text-[6rem] font-black text-white/20 select-none font-display">
            {initial}
          </span>
        </div>
      )}

      {/* ===== Затемнение снизу для читаемости текста ===== */}
      {coverImage && (
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent pointer-events-none z-[1]" />
      )}

      {/* ===== Название — всегда видимо, внизу слева ===== */}
      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
        <h3 className="font-display text-base sm:text-lg font-bold text-white leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {collection.title}
        </h3>
      </div>

      {/* ===== Боковая панель — выезжает слева при наведении ===== */}
      <div className="absolute inset-y-0 left-0 z-20 w-3/4 max-w-[220px]
                      -translate-x-full group-hover:translate-x-0
                      transition-all duration-300 ease-out pointer-events-none">
        {/* Затемнённый фон панели */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Контент панели */}
        <div className="relative h-full p-3 flex flex-col justify-center gap-2 pointer-events-auto">
          {/* Акцентная полоска сверху */}
          <div
            className="w-8 h-[2px] rounded-full shrink-0"
            style={{ background: accentColor }}
          />

          {/* Описание */}
          {collection.excerpt ? (
            <p className="text-sm text-(--ink-1) leading-snug line-clamp-6">
              {collection.excerpt}
            </p>
          ) : (
            <p className="text-sm text-(--ink-2) italic leading-snug">
              Подборка книг от редакции BookStrata
            </p>
          )}

          {/* Нижняя часть: счётчик + кнопка */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-1.5">
            {booksCount > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-(--ink-2)/70">
                <BookOpen size={11} />
                <span>
                  {booksCount}{' '}
                  {booksCount === 1 ? 'книга' :
                   booksCount < 5 ? 'книги' : 'книг'}
                </span>
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em]
                         text-(--accent-main) hover:text-(--ink-0)
                         transition-colors duration-150"
              aria-label={`Посмотреть подборку: ${collection.title}`}
            >
              Смотреть
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
