import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { sileo } from "sileo";
import { createTierList, saveTierListTiers } from "@/lib/api";
import { CategoryTabs } from "@/components/CommunityComponents/CategoryTabs";
import { TemplateGrid } from "@/components/CommunityComponents/TemplateGrid";
import { HeroSection } from "@/components/CommunityComponents/HeroSection";
import { NewsSection } from "@/components/CommunityComponents/NewsSection";
import { CollectionsSection } from "@/components/CommunityComponents/CollectionsSection";
import { TemplatePreviewModal } from "@/components/CommunityComponents/TemplatePreviewModal";
import { type TemplateItem } from "../../data/mockData";
import "./CommunityPage.css";

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

  // Оптимизация: стабилизируем колбэки для предотвращения лишних ререндеров TemplateGrid и модалки
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

  return (
    <DashboardLayout
      onMyRatingsClick={() => navigate("/")}
      showTemplatesNav={true}
      showSearch={false}
      activeItem="Новости"
    >
      <div className="community-shell min-h-screen">
        <main className="max-w-7xl mx-auto px-6 pb-20 cursor-default text-(--ink-0)">
          <HeroSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <CategoryTabs
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

          <div className="space-y-6">
            {CATEGORIES.map((category) => (
              <div
                key={category.id}
                id={`panel-${category.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${category.id}`}
                hidden={activeCategory !== category.id}
              >
                {activeCategory === category.id && (
                  <TemplateGrid
                    activeCategory={activeCategory}
                    searchQuery={searchQuery}
                    applyingTemplateId={applyingTemplateId}
                    onUseTemplate={handleUseTemplate}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 my-12 reveal" data-reveal>
            <div className="community-rule flex-1" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-(--ink-1)">
              Далее
            </span>
            <div className="community-rule flex-1" />
          </div>

          <NewsSection />

          <CollectionsSection />
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
