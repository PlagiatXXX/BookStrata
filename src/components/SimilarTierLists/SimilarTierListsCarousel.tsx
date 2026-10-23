import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useRef } from "react";
import { getSimilarTierLists } from "@/lib/tierListApi";
import { buildSimilarTierListsJsonLd } from "./seo";
import { proxyImageUrl } from "@/utils/imageProxy";
import { RetryableImage } from "@/ui/RetryableImage";
import { booksCountText } from "@/lib/plural";

import type { TierListShort } from "@/lib/tierListApi";

interface SimilarTierListsCarouselProps {
  tierListId: string;
  /** Похожие тир-листы, уже полученные с основным ответом страницы (без отдельного запроса) */
  initialSimilar?: TierListShort[];
}

export function SimilarTierListsCarousel({
  tierListId,
  initialSimilar,
}: SimilarTierListsCarouselProps) {
  const hasInitial = Array.isArray(initialSimilar);
  const { data, isLoading } = useQuery({
    queryKey: ["similar-tier-lists", tierListId],
    queryFn: () => getSimilarTierLists(tierListId, 4),
    enabled: !!tierListId && !hasInitial,
    initialData: hasInitial ? initialSimilar : undefined,
    staleTime: hasInitial ? 5 * 60 * 1000 : 0,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -240 : 240,
      behavior: "smooth",
    });
  };

  if (isLoading || !data || data.length === 0) return null;

  const similarJsonLd = buildSimilarTierListsJsonLd(data);

  return (
    <>
      {similarJsonLd && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(similarJsonLd)}
          </script>
        </Helmet>
      )}
      <section className="mt-8">
      <h2 className="text-lg font-bold mb-4 text-(--theme-text)">
        Похожие тир-листы
      </h2>
      <div className="relative group">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 -ml-3 bg-(--theme-bg)/80 backdrop-blur rounded-full border border-(--theme-border) flex items-center justify-center text-(--theme-text) hover:text-(--theme-accent-primary) hover:border-(--theme-accent-primary) transition-colors shadow-sm opacity-0 group-hover:opacity-100 hidden md:flex cursor-pointer"
          aria-label="Прокрутить влево"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {data.map((tl) => (
            <Link
              key={tl.id}
              to={`/tier-lists/${tl.slug || tl.id}`}
              className="snap-start shrink-0 w-48 md:w-56"
            >
              <div className="rounded-lg overflow-hidden bg-(--theme-bg) border border-(--theme-border) hover:border-(--theme-accent-primary) transition-colors">
                <div className="aspect-[4/3] overflow-hidden">
                  {tl.coverImageUrl ? (
                    <RetryableImage
                      src={proxyImageUrl(tl.coverImageUrl)}
                      alt={tl.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      fallbackSrc="/images/placeholder.svg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-(--theme-text-muted) text-3xl font-bold bg-(--theme-bg)">
                      {tl.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-(--theme-text) line-clamp-2">
                    {tl.title}
                  </h3>
                  <p className="text-xs text-(--theme-text-muted) mt-1 line-clamp-1">
                    {tl.authorName || tl.user?.username || "Неизвестный автор"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-(--theme-text-muted)">
                    <span className="flex items-center gap-1">
                      <Heart size={12} />
                      {tl.likesCount || 0}
                    </span>
                    <span>{booksCountText(tl.booksCount || 0)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 -mr-3 bg-(--theme-bg)/80 backdrop-blur rounded-full border border-(--theme-border) flex items-center justify-center text-(--theme-text) hover:text-(--theme-accent-primary) hover:border-(--theme-accent-primary) transition-colors shadow-sm opacity-0 group-hover:opacity-100 hidden md:flex cursor-pointer"
          aria-label="Прокрутить вправо"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
    </>
  );
}
