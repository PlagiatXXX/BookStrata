import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { sileo } from "sileo";
import { createTierList, saveTierListTiers } from "@/lib/tierListApi";
import { CategoryTabs } from "@/components/CommunityComponents/CategoryTabs";
import { TemplateGrid } from "@/components/CommunityComponents/TemplateGrid";
import { HeroSection } from "@/components/CommunityComponents/HeroSection";
import { NewsSection } from "@/components/CommunityComponents/NewsSection";
import { CollectionsSection } from "@/components/CommunityComponents/CollectionsSection";
import { TemplatePreviewModal } from "@/components/CommunityComponents/TemplatePreviewModal";
import { useDebounce } from "@/hooks/useDebounce";
import { type TemplateItem } from "../../data/mockData";
import { memo } from "react";
import "./CommunityPage.css";

// Мемоизируем компоненты для предотвращения лишних ререндеров
const MemoizedHeroSection = memo(HeroSection);
const MemoizedCategoryTabs = memo(CategoryTabs);
const MemoizedTemplateGrid = memo(TemplateGrid);
const MemoizedNewsSection = memo(NewsSection);
const MemoizedCollectionsSection = memo(CollectionsSection);

export default function CommunityPage() {
  const [activeCategory, setActiveCategory] = useState("actual");
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingTemplateId, setApplyingTemplateId] = useState<number | null>(
    null,
  );
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(
    null,
  );
  const navigate = useNavigate();

  // Оптимизация: дебаунсим поисковый запрос для фильтрации сетки шаблонов
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (elements.length === 0) return;

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
  }, [activeCategory]);

  // Стабилизируем колбэки
  const handleUseTemplate = useCallback((template: TemplateItem) => {
    setPreviewTemplate(template);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  const handleConfirmUseTemplate = useCallback(async () => {
    if (!previewTemplate) return;

    try {
      setApplyingTemplateId(previewTemplate.id);

      // 1. Создаём тир-лист
      const createdList = await createTierList(
        previewTemplate.templateData.title,
      );

      // 2. Создаём уровни
      const tiersForApi = previewTemplate.templateData.tiers.map((tier) => ({
        title: tier.name,
        color: tier.color,
        rank: tier.order,
      }));

      await saveTierListTiers(String(createdList.id), tiersForApi);

      const defaultBooksCount =
        previewTemplate.templateData.defaultBooks?.length || 0;
      sileo.success({
        title: "Шаблон открыт в рейтингах",
        description:
          defaultBooksCount > 0
            ? `${defaultBooksCount} книг будет добавлено в редакторе`
            : "Шаблон готов к заполнению",
        duration: 3000,
      });
      navigate(`/tier-lists/${createdList.id}`);
    } catch (error) {
      console.error(error);
      sileo.error({
        title: "Не удалось открыть шаблон",
        description: "Попробуйте снова позже",
        duration: 3000,
      });
    } finally {
      setApplyingTemplateId(null);
      setPreviewTemplate(null);
    }
  }, [previewTemplate, navigate]);

  const handleMyRatingsClick = useCallback(() => navigate("/"), [navigate]);

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      showTemplatesNav={true}
      showSearch={false}
      activeItem="Новости"
    >
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
              Популярное на этой неделе
            </h2>
            <button className="text-(--ink-0) text-xs font-semibold uppercase tracking-[0.12em] border-b border-(--line-soft) hover:border-(--line-strong) cursor-pointer">
              Смотреть все
            </button>
          </div>

          <MemoizedTemplateGrid
            activeCategory={activeCategory}
            searchQuery={debouncedSearchQuery}
            applyingTemplateId={applyingTemplateId}
            onUseTemplate={handleUseTemplate}
          />

          <div className="flex items-center gap-4 my-12 reveal" data-reveal>
            <div className="community-rule flex-1" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-(--ink-1)">
              Далее
            </span>
            <div className="community-rule flex-1" />
          </div>

          <MemoizedNewsSection />

          <MemoizedCollectionsSection />
        </main>
      </div>

      <Link
        to="/templates/new"
        className="fixed bottom-8 right-8 brutal-cta w-14 h-14 flex items-center justify-center group z-50"
        title="Создать шаблон"
      >
        <Plus size={24} />
        <span className="absolute right-18 bg-(--ink-0) text-(--bg-0) px-3 py-2 rounded-sm text-[10px] font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-(--line-strong)">
          Создать шаблон
        </span>
      </Link>

      {/* Модалка предпросмотра шаблона */}
      <TemplatePreviewModal
        template={previewTemplate!}
        isOpen={!!previewTemplate}
        onClose={handleClosePreview}
        onConfirm={handleConfirmUseTemplate}
        isApplying={applyingTemplateId === previewTemplate?.id}
      />
    </DashboardLayout>
  );
}
