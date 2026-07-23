import { useEffect, useState, memo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { CategoryTabs } from "@/components/CommunityComponents/CategoryTabs";
import { CollectionGrid } from "@/components/CommunityComponents/CollectionGrid";
import { HeroSection } from "@/components/CommunityComponents/HeroSection";
import { NewsSection } from "@/components/CommunityComponents/NewsSection";
import { ExternalNewsSection } from "@/components/CommunityComponents/ExternalNewsSection";
import { CollectionsSection } from "@/components/CommunityComponents/CollectionsSection";
import "./CommunityPage.css";

// Мемоизируем компоненты для предотвращения лишних ререндеров
const MemoizedHeroSection = memo(HeroSection);
const MemoizedCategoryTabs = memo(CategoryTabs);
const MemoizedCollectionGrid = memo(CollectionGrid);
const MemoizedNewsSection = memo(NewsSection);
const MemoizedExternalNewsSection = memo(ExternalNewsSection);
const MemoizedCollectionsSection = memo(CollectionsSection);

export default function CommunityPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(
    () => searchParams.get("category") || "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Прокрутка к якорю при переходе с других страниц
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      // Ждём рендера lazy-компонентов и прокручиваем
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, [location.hash]);

  // Синхронизируем category с URL, чтобы при навигации назад сохранялся раздел
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (activeCategory === "all") {
          next.delete("category");
        } else {
          next.set("category", activeCategory);
        }
        return next;
      },
      { replace: true },
    );
  }, [activeCategory, setSearchParams]);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (elements.length === 0) return;

    // Если пользователь предпочитает уменьшенное движение — показываем сразу
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => el.classList.add('reveal--visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeCategory, searchQuery]);

  return (
    <DashboardLayout
      showTemplatesNav={true}
      showSearch={false}
      activeItem="Новости"
      bgVariant="dark"
    >
      <SEOHead
        title="Новости и сообщество книжных рейтингов"
        description="Подборки книг, редакционные статьи, новости книжного мира. Найдите вдохновение для следующего тир-листа в сообществе BookStrata."
        url="/community"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Новости и сообщество", url: "/community" },
        ]}
      />
      <div className="px-6 pt-6 pb-2">
        <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Новости и сообщество" }]} />
      </div>
      <div className="community-shell min-h-screen">
        <main className="max-w-7xl mx-auto px-6 pb-20 cursor-default text-(--ink-0)">
          <MemoizedHeroSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <MemoizedCategoryTabs
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />

          <div
            className="flex items-end justify-between mb-6 reveal"
            data-reveal
          >
            <h2 className="community-heading text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <TrendingUp className="text-(--accent-main)" size={28} />
              Подборки BookStrata
            </h2>
          </div>

          <MemoizedCollectionGrid
            activeCategory={activeCategory}
            searchQuery={searchQuery}
          />

          <div className="flex items-center gap-4 my-12 reveal" data-reveal>
            <div className="community-rule flex-1" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-(--ink-1)">
              Далее
            </span>
            <div className="community-rule flex-1" />
          </div>

          <MemoizedNewsSection searchQuery={searchQuery} />

          <MemoizedExternalNewsSection />

          <MemoizedCollectionsSection />
        </main>
      </div>
    </DashboardLayout>
  );
}
