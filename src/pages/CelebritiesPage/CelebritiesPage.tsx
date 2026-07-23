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

const SCROLL_AMOUNT = 240;

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
        title="Что читают знаменитости? — BookStrata"
        description="Узнайте, какие книги читают известные люди: актёры, музыканты, предприниматели, спортсмены и другие знаменитости. Тир-листы любимых книг."
        url="/celebrities"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Что читают знаменитости", url: "/celebrities" },
        ]}
      />
      <DashboardLayout showSearch={false} activeItem="Знаменитости">
        <div className="px-6 pt-6 pb-4">
          <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Что читают знаменитости" }]} />
        </div>

        <div className="celebrities-page max-w-6xl mx-auto px-6 pb-12">
          {/* Hero */}
          <div className="celebrities-hero mb-8">
            <h1 className="celebrities-title">
              Что читают знаменитости?
            </h1>
            <p className="celebrities-subtitle">
              Любимые книги известных людей: актёров, музыкантов, предпринимателей, спортсменов и других. 
              Узнайте, что вдохновляет кумиров.
            </p>
          </div>

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
            <div className="flex items-center justify-center py-12 text-gray-300">
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

          {/* Grid */}
          {!isLoading && celebrities.length > 0 && filteredCelebrities.length === 0 && (
            <div className="celebrities-empty">
              <p className="celebrities-empty-text">
                В этой категории пока нет знаменитостей.
              </p>
            </div>
          )}

          {!isLoading && filteredCelebrities.length > 0 && (
            <div className="celebrities-grid">
              {filteredCelebrities.map((celebrity) => (
                <CelebrityCard key={celebrity.id} celebrity={celebrity} />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

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
    el.scrollBy({ left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT, behavior: "smooth" });
  }, []);

  const categories = useMemo(() => {
    const entries = Object.entries(CELEBRITY_CATEGORIES)
      .filter(([key]) => key === "all" || (categoryStats[key] && categoryStats[key] > 0));

    // Добавляем категории, которых нет в CELEBRITY_CATEGORIES, но есть в stats
    Object.entries(categoryStats).forEach(([key]) => {
      if (!CELEBRITY_CATEGORIES[key] && !entries.find(([k]) => k === key)) {
        entries.push([key, key]);
      }
    });

    return entries;
  }, [categoryStats]);

  return (
    <section className="celebrities-tabs-section mb-8">
      {/* Левая стрелка */}
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

      {/* Контейнер с табами */}
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
            className={`celebrities-tab ${
              activeCategory === key ? "active" : ""
            }`}
          >
            {label}
            {key !== "all" && categoryStats[key] && (
              <span className="celebrities-tab-count">{categoryStats[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Правая стрелка */}
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

const CelebrityCard = memo(function CelebrityCard({
  celebrity,
}: {
  celebrity: CelebrityItem;
}) {
  const bookCount = celebrity.books ? Object.keys(celebrity.books).length : 0;
  const categoryLabel = CELEBRITY_CATEGORIES[celebrity.category] || celebrity.category;

  return (
    <Link
      to={`/celebrities/${celebrity.slug}`}
      className="celebrity-card"
    >
      {/* Фото */}
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

      {/* Информация */}
      <div className="celebrity-card-info">
        <h3 className="celebrity-card-name">{celebrity.name}</h3>
        {categoryLabel && (
          <span className="celebrity-card-category">{categoryLabel}</span>
        )}
      </div>

      {/* Количество книг */}
      {bookCount > 0 && (
        <div className="celebrity-card-books">
          <span>{bookCount}</span>
          <span className="celebrity-card-books-label">
            {bookCount === 1 ? "книга" : bookCount < 5 ? "книги" : "книг"}
          </span>
        </div>
      )}
    </Link>
  );
});


