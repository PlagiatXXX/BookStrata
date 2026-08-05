import { memo, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCommunityCollections } from "@/lib/collectionsApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import { RetryableImage } from "@/ui/RetryableImage";

export const CollectionsSection = memo(() => {
  const { data: collections = [] } = useQuery({
    queryKey: ["published-collections"],
    queryFn: getCommunityCollections,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const literaryCollections = useMemo(
    () => collections.filter((c) => c.type === "literary"),
    [collections],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const hasLiteraryCollections = literaryCollections.length > 0;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Наблюдаем появление секции через IntersectionObserver,
    // т.к. она рендерится динамически после загрузки данных
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal--visible");
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasLiteraryCollections]);

  if (literaryCollections.length === 0) return null;

  return (
    <section ref={sectionRef} className="mt-20 brutal-card brutal-border p-8 reveal">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h2 className="community-heading text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
            Литературные подборки
          </h2>
          <p className="text-(--ink-1) mt-1">Отобрано модераторами</p>
        </div>
      </div>

      <div className="community-rule mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {literaryCollections.map((collection) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.slug}`}
            className="brutal-card brutal-border p-6 hover-lift block cursor-pointer no-underline"
          >
            {collection.bookCovers && collection.bookCovers.length > 0 ? (
              <div className="flex gap-1 mb-4">
                {collection.bookCovers.map((img: string, idx: number) => (
                  <div
                    key={`${img}-${idx}`}
                    className="flex-1 h-20 bg-(--bg-0) border border-(--line-soft) rounded-sm overflow-hidden"
                  >
                    <RetryableImage
                      alt={`Cover ${idx + 1}`}
                      className="w-full h-full object-cover"
                      src={img}
                      fallbackSrc="/images/placeholder.svg"
                    />
                  </div>
                ))}
              </div>
            ) : collection.coverImageUrl ? (
              <div className="mb-4 h-20 bg-(--bg-0) border border-(--line-soft) rounded-sm overflow-hidden">
                <RetryableImage
                  alt={collection.title}
                  className="w-full h-full object-cover"
                  src={proxyImageUrl(collection.coverImageUrl)}
                  fallbackSrc="/images/placeholder.svg"
                />
              </div>
            ) : null}
            <h4 className="community-heading text-xl font-bold leading-tight mb-3">
              {collection.title}
            </h4>
            <p className="text-(--ink-1) text-sm leading-relaxed line-clamp-3">
              {collection.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
});
