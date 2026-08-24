import { useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RetryableImage } from "@/ui/RetryableImage";
import { proxyImageUrl } from "@/utils/imageProxy";
import type { TrendingBook } from "@/lib/bookApi";

interface TrendingBooksCarouselProps {
  books: TrendingBook[];
}

const NEON_CLASSES = ["neon-border-gold", "neon-border-cyan", "neon-border-pink", "neon-border-magenta"];

export function TrendingBooksCarousel({ books }: TrendingBooksCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  }, []);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -224 : 224, behavior: "smooth" });
  };

  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold text-on-surface mb-6 text-glow-subtle">
        Тренды недели
      </h2>

      <div className="relative flex items-center w-full group">
        {/* Стрелка влево */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 w-9 h-9 -ml-4 bg-surface-container-high/80 backdrop-blur rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface hover:text-primary hover:border-primary transition-colors shadow-[0_0_15px_rgba(236,178,255,0.2)] opacity-0 group-hover:opacity-100 hidden md:flex cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Карусель */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto rankings-no-scrollbar py-6 px-4 w-full scroll-smooth snap-x snap-mandatory"
        >
          {books.map((book, i) => {
            const neonClass = NEON_CLASSES[i % NEON_CLASSES.length];
            const inner = (
              <div className={`shrink-0 w-28 md:w-40 aspect-[2/3] rounded-lg overflow-hidden relative group/card ${neonClass}`}>
                <RetryableImage
                  src={proxyImageUrl(book.coverImageUrl)}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 cover-glow"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-bold text-xs leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {book.title}
                  </p>
                </div>
              </div>
            );

            return book.slug ? (
              <Link key={book.id} to={`/books/${book.slug}`} className="snap-center">
                {inner}
              </Link>
            ) : (
              <div key={book.id} className="snap-center">
                {inner}
              </div>
            );
          })}
        </div>

        {/* Стрелка вправо */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 w-10 h-10 -mr-5 bg-surface-container-high/80 backdrop-blur rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface hover:text-primary hover:border-primary transition-colors shadow-[0_0_15px_rgba(236,178,255,0.2)] opacity-0 group-hover:opacity-100 hidden md:flex cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Прогресс-бар */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: Math.max(1, Math.ceil(books.length / 4)) }).map((_, i, arr) => {
          const segmentProgress = i / (arr.length - 1 || 1);
          const isActive = Math.abs(scrollProgress - segmentProgress) < 0.5 / arr.length;
          return (
            <div
              key={i}
              className={`h-[2px] w-8 transition-colors ${
                isActive
                  ? "bg-secondary-fixed-dim shadow-[0_0_8px_#00dbe9]"
                  : "bg-surface-container-high"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
