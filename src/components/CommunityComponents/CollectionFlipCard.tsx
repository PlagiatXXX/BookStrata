import { memo, useCallback, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { CollectionItem } from '@/data/mockData';
import { proxyImageUrl } from '@/utils/imageProxy';

interface CollectionFlipCardProps {
  collection: CollectionItem;
  className?: string;
}

const FALLBACK = '/images/placeholder.svg';

const DEFAULT_ACCENT = 'var(--accent-main)';

export const CollectionFlipCard = memo(({ collection, className = '' }: CollectionFlipCardProps) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHoverRef = useRef(
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );

  const handleMouseEnter = useCallback(() => {
    if (!canHoverRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsFlipped(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!canHoverRef.current) return;
    // Небольшая задержка перед закрытием, чтобы не дёргалось
    timerRef.current = setTimeout(() => setIsFlipped(false), 100);
  }, []);

  const handleClick = useCallback(() => {
    navigate(`/collections/${collection.slug}`);
  }, [navigate, collection.slug]);

  // Приоритет: coverImageUrl коллекции → первая обложка книги → null
  const coverImage = collection.coverImageUrl || collection.bookCovers?.[0] || null;
  const accentColor = collection.accentColor || DEFAULT_ACCENT;

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
      className={`relative min-h-[260px] [perspective:1000px] cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-label={`Подборка: ${collection.title}`}
    >
      <div
        className={`absolute inset-0 duration-500 [transform-style:preserve-3d] will-change-transform ${
          isFlipped ? '[transform:rotateX(180deg)]' : ''
        }`}
      >
        {/* ===== Лицевая сторона ===== */}
        <div className="absolute inset-0 rounded-sm overflow-hidden [backface-visibility:hidden] [transform:translateZ(0)]">
          {coverImage ? (
            <img
              alt=""
              className="h-full w-full object-cover"
              src={proxyImageUrl(coverImage)}
              onError={(e) => { e.currentTarget.src = FALLBACK; }}
              loading="lazy"
            />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }}
            >
              <span className="text-[6rem] font-black text-white/20 select-none font-display">
                {initial}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-display text-lg font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {collection.title}
            </h3>
          </div>
        </div>

        {/* ===== Обратная сторона ===== */}
        <div
          className="absolute inset-0 rounded-sm overflow-hidden [backface-visibility:hidden] [transform:rotateX(180deg)_translateZ(0)]
                     flex flex-col justify-between"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
        >
          <div className="p-4 pb-0">
            <h3 className="font-display text-lg font-bold text-white leading-tight drop-shadow-sm">
              {collection.title}
            </h3>
          </div>

          <div className="px-4 flex-1 flex items-start pt-2">
            {collection.excerpt ? (
              <p className="text-sm text-white/90 leading-snug line-clamp-6">
                {collection.excerpt}
              </p>
            ) : (
              <p className="text-sm text-white/70 italic leading-snug">
                Подборка книг от редакции BookStrata
              </p>
            )}
          </div>

          <div className="p-4 pt-2 flex items-center justify-between gap-2">
            {booksCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <BookOpen size={12} />
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
                         bg-white/20 hover-only:bg-white/30 text-white
                         px-3 py-1.5 rounded-sm
                         transition-colors duration-150"
              aria-label={`Посмотреть подборку: ${collection.title}`}
            >
              Смотреть
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
