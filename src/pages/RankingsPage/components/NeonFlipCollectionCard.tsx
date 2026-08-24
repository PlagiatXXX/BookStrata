import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { RetryableImage } from "@/ui/RetryableImage";
import { proxyImageUrl } from "@/utils/imageProxy";
import type { CollectionItem } from "@/types/collection";

interface NeonFlipCollectionCardProps {
  collection: CollectionItem;
  index: number;
  className?: string;
}

const NEON_CLASSES = ["neon-border-cyan", "neon-border-pink", "neon-border-magenta"];
const FALLBACK = "/images/placeholder.svg";

export function NeonFlipCollectionCard({ collection, index, className = "" }: NeonFlipCollectionCardProps) {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHoverRef = useRef(
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

  const handleMouseEnter = useCallback(() => {
    if (!canHoverRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsFlipped(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!canHoverRef.current) return;
    timerRef.current = setTimeout(() => setIsFlipped(false), 100);
  }, []);

  const handleClick = useCallback(() => {
    navigate(`/collections/${collection.slug}`);
  }, [navigate, collection.slug]);

  const coverImage = collection.coverImageUrl || collection.bookCovers?.[0] || null;
  const booksCount = useMemo(
    () => Object.keys(collection.books || {}).length,
    [collection.books],
  );

  const neonClass = NEON_CLASSES[index % NEON_CLASSES.length];

  return (
    <article
      className={`relative h-[260px] [perspective:1000px] cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      aria-label={`Подборка: ${collection.title}`}
    >
      <div
        className={`absolute inset-0 duration-500 [transform-style:preserve-3d] will-change-transform ${
          isFlipped ? "[transform:rotateX(180deg)]" : ""
        }`}
      >
        {/* Лицевая сторона */}
        <div className={`absolute inset-0 rounded-xl overflow-hidden [backface-visibility:hidden] [transform:translateZ(0)] glass-card ${neonClass}`}>
          {coverImage ? (
            <RetryableImage
              src={proxyImageUrl(coverImage)}
              alt={`Подборка: ${collection.title}`}
              className="h-full w-full object-cover cover-glow"
              fallbackSrc={FALLBACK}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-surface-container">
              <span className="text-[6rem] font-black text-white/20 select-none">
                {collection.title.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-display text-lg font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {collection.title}
            </h3>
          </div>
        </div>

        {/* Обратная сторона */}
        <div className={`absolute inset-0 rounded-xl [backface-visibility:hidden] [transform:rotateX(180deg)] glass-card ${neonClass} p-6 flex flex-col justify-between`}>
          <div>
            <h3 className="font-display text-lg font-bold text-white mb-2">
              {collection.title}
            </h3>
            <p className="text-sm text-white/70 line-clamp-3">
              {collection.excerpt || "Подборка книг от редакции BookStrata"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
              <BookOpen size={14} />
              <span>{booksCount} {booksCount === 1 ? "книга" : booksCount < 5 ? "книги" : "книг"}</span>
            </div>
            <div className="flex items-center gap-1 text-cyan-300 text-sm font-semibold">
              Смотреть <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
