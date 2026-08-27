import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Spinner } from "@/components/Spinner";
import { getCelebrities, CELEBRITY_CATEGORIES } from "@/lib/celebritiesApi";
import type { CelebrityItem } from "@/lib/celebritiesApi";
import "./CelebritiesPage.css";

/** Паттерн расположения карточек в асимметричном гриде */
type CardSize = "featured" | "standard" | "wide";

function getCardSize(index: number, _total: number): CardSize {
  // Паттерн: featured (0), standard (1), standard (2), wide (3), wide (4), ...
  const pos = index % 5;
  if (pos === 0) return "featured";
  if (pos === 1 || pos === 2) return "standard";
  return "wide"; // pos === 3 || pos === 4
}

const PAGE_SIZE = 5;

export default function CelebritiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  const { data: celebrities = [], isLoading } = useQuery({
    queryKey: ["celebrities"],
    queryFn: getCelebrities,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const setActiveCategory = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id === "all") {
            next.delete("category");
          } else {
            next.set("category", id);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Фильтрация по категории
  const filteredCelebrities = useMemo(() => {
    if (activeCategory === "all") return celebrities;
    return celebrities.filter((c) => c.category === activeCategory);
  }, [celebrities, activeCategory]);

  // Статистика категорий
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    celebrities.forEach((c) => {
      const cat = c.category || "other";
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  }, [celebrities]);

  return (
    <>
      <SEOHead
        title="Что читают знаменитости?"
        description="Узнайте, какие книги читают известные люди: актёры, музыканты, предприниматели, спортсмены и другие знаменитости. Тир-листы любимых книг."
        url="/celebrities"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Что читают знаменитости", url: "/celebrities" },
        ]}
      />
      <DashboardLayout showSearch={false} activeItem="Знаменитости" bgVariant="dark">
        <div className="px-6 pt-6 pb-4">
          <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Что читают знаменитости" }]} />
        </div>

        <div className="celebrities-page max-w-[1440px] mx-auto px-4 sm:px-6 md:px-20 pb-32">
          {/* Hero */}
          <header className="celebrities-hero mb-12">
            <h1 className="celebrities-title">
              Что читают<br />
              <span className="celebrities-title-accent">знаменитости?</span>
            </h1>
            <p className="celebrities-subtitle">
              Любимые книги известных людей: актёров, музыкантов, предпринимателей, спортсменов и других.
              Узнайте, что вдохновляет кумиров в нашем специальном редакционном материале.
            </p>
          </header>

          {/* Category Tabs */}
          {!isLoading && celebrities.length > 0 && (
            <CategoryTabs
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categoryStats={categoryStats}
            />
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12" style={{ color: "var(--muse-on-surface-variant)" }}>
              <Spinner size="md" className="mr-2" />
              Загрузка...
            </div>
          )}

          {/* Empty state */}
          {!isLoading && celebrities.length === 0 && (
            <div className="celebrities-empty">
              <div className="celebrities-empty-icon">📚</div>
              <h2 className="celebrities-empty-title">Скоро здесь появятся знаменитости</h2>
              <p className="celebrities-empty-text">
                Мы собираем информацию о том, какие книги читают известные люди.
              </p>
            </div>
          )}

          {/* Grid — пустой результат фильтра */}
          {!isLoading && celebrities.length > 0 && filteredCelebrities.length === 0 && (
            <div className="celebrities-empty">
              <p className="celebrities-empty-text">
                В этой категории пока нет знаменитостей.
              </p>
            </div>
          )}

          {/* Asymmetric Grid */}
          {!isLoading && filteredCelebrities.length > 0 && (
            <CelebrityGrid
              key={activeCategory}
              celebrities={filteredCelebrities}
            />
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Category Tabs
   ═══════════════════════════════════════════════════════ */

function CategoryTabs({
  activeCategory,
  setActiveCategory,
  categoryStats,
}: {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  categoryStats: Record<string, number>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -240 : 240, behavior: "smooth" });
  }, []);

  const categories = useMemo(() => {
    const entries = Object.entries(CELEBRITY_CATEGORIES)
      .filter(([key]) => key === "all" || (categoryStats[key] && categoryStats[key] > 0));

    Object.entries(categoryStats).forEach(([key]) => {
      if (!CELEBRITY_CATEGORIES[key] && !entries.find(([k]) => k === key)) {
        entries.push([key, key]);
      }
    });

    return entries;
  }, [categoryStats]);

  return (
    <section className="celebrities-tabs-section">
      <button
        type="button"
        aria-label="Прокрутить влево"
        onClick={() => scrollBy("left")}
        className={`celebrities-tab-arrow left ${
          canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft size={18} />
      </button>

      <div
        ref={scrollRef}
        className="celebrities-tabs-scroll"
        role="tablist"
        aria-label="Категории знаменитостей"
      >
        {categories.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeCategory === key}
            onClick={() => setActiveCategory(key)}
            className={`celebrities-tab ${activeCategory === key ? "active" : ""}`}
          >
            {label}
            {key !== "all" && categoryStats[key] && (
              <span className="celebrities-tab-count">({categoryStats[key]})</span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Прокрутить вправо"
        onClick={() => scrollBy("right")}
        className={`celebrities-tab-arrow right ${
          canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   Celebrity Grid — paginated asymmetric grid
   ═══════════════════════════════════════════════════════ */

function CelebrityGrid({ celebrities }: { celebrities: CelebrityItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleCelebrities = useMemo(
    () => celebrities.slice(0, visibleCount),
    [celebrities, visibleCount],
  );

  const hasMore = visibleCount < celebrities.length;

  return (
    <>
      <div className="celebrities-grid">
        {visibleCelebrities.map((celebrity, index) => (
          <CelebrityCard
            key={celebrity.id}
            celebrity={celebrity}
            size={getCardSize(index, visibleCelebrities.length)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-12">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="celebrities-show-more-btn"
          >
            Показать больше
          </button>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Celebrity Card — full-bleed glassmorphic
   ═══════════════════════════════════════════════════════ */

const CATEGORY_COLORS: Record<string, string> = {
  actor: "var(--muse-secondary)",
  singer: "var(--muse-secondary)",
  financier: "var(--muse-primary)",
  other: "var(--muse-tertiary)",
  sportsman: "var(--muse-tertiary)",
  writer: "var(--muse-primary)",
  scientist: "var(--muse-primary)",
  musician: "var(--muse-secondary)",
  blogger: "var(--muse-secondary)",
  director: "var(--muse-primary)",
  philosopher: "var(--muse-primary)",
  "tv-host": "var(--muse-secondary)",
};

function getBookCountLabel(count: number): string {
  if (count === 1) return "книга";
  if (count >= 2 && count <= 4) return "книги";
  return "книг";
}

const CelebrityCard = memo(function CelebrityCard({
  celebrity,
  size,
}: {
  celebrity: CelebrityItem;
  size: CardSize;
}) {
  const bookCount = celebrity.books ? Object.keys(celebrity.books).length : 0;
  const categoryLabel = CELEBRITY_CATEGORIES[celebrity.category] || celebrity.category;
  const categoryColor = CATEGORY_COLORS[celebrity.category] || "var(--muse-on-surface-variant)";

  return (
    <Link
      to={`/celebrities/${celebrity.slug}`}
      className="celebrity-card"
      data-featured={size === "featured" ? "true" : undefined}
      data-size={size === "featured" ? undefined : size}
      data-category={celebrity.category}
    >
      {/* Фото на всю карточку */}
      <div className="celebrity-card-photo">
        {celebrity.photoUrl ? (
          <img
            src={celebrity.photoUrl}
            alt={celebrity.name}
            className="celebrity-card-img"
            loading="lazy"
          />
        ) : (
          <div className="celebrity-card-placeholder">
            {celebrity.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="celebrity-card-overlay" />

      {/* Контент */}
      <div className="celebrity-card-content">
        <span className="celebrity-card-category" style={{ color: categoryColor }}>
          {categoryLabel}
        </span>

        {size === "featured" || size === "wide" ? (
          <div className="celebrity-card-footer">
            <div>
              <h2 className="celebrity-card-name">{celebrity.name}</h2>
            </div>
            {bookCount > 0 && (
              <span className="celebrity-card-badge">
                {bookCount} {getBookCountLabel(bookCount)}
              </span>
            )}
          </div>
        ) : (
          <>
            <h2 className="celebrity-card-name">{celebrity.name}</h2>
            {bookCount > 0 && (
              <span className="celebrity-card-badge">
                {bookCount} {getBookCountLabel(bookCount)}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
});
