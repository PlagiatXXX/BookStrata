import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Plus } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { CollectionFlipCard } from "@/components/CommunityComponents/CollectionFlipCard";
import { getFeaturedCollections } from "@/lib/collectionsApi";
import { useAuth } from "@/hooks/useAuthContext";

export default function RankingsPage() {
  const { isAuthenticated } = useAuth();
  const {
    data: collections = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["featured-collections"],
    queryFn: getFeaturedCollections,
    staleTime: 0,
    retry: 2,
  });

  // Все редакционные подборки (isFeatured = true), независимо от типа
  const featuredWithNotes = useMemo(
    () => collections.filter((c) => c.editorialNote),
    [collections],
  );
  const featuredWithoutNotes = useMemo(
    () => collections.filter((c) => !c.editorialNote),
    [collections],
  );

  return (
    <>
      <SEOHead
        title="Рейтинг книг — лучшие книги и что почитать"
        description="Редакционные подборки BookStrata: лучшие книги в жанрах, составленные редакцией. Найдите что почитать."
        url="/rankings"
      />
      <DashboardLayout showSearch={false}>
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="pt-4 pb-2">
            <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Рейтинг книг" }]} />
          </div>
          {/* Hero */}
          <div className="mb-10">
            <h1 className="community-heading text-3xl font-black leading-tight sm:text-4xl md:text-5xl mb-4">
              Рейтинг книг
            </h1>
            <p className="text-lg text-(--ink-2) max-w-2xl">
              Редакционные подборки BookStrata — мы собрали лучшие книги по разным жанрам,
              чтобы вам было проще найти что почитать.
            </p>
          </div>

          {/* Сетка коллекций */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[200px]">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse brutal-card h-full min-h-[200px] bg-(--bg-1) rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-(--ink-2)">
              <p className="text-red-400/80">Не удалось загрузить подборки</p>
              <p className="text-sm mt-2">Попробуйте обновить страницу</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12 text-(--ink-2)">
              <p>Редакционные подборки готовятся</p>
              <p className="text-sm mt-2">Скоро здесь появятся рейтинги книг от редакции BookStrata</p>
            </div>
          ) : (
            <>
              {/* Коллекции с редакционной заметкой — двухколоночная сетка */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredWithNotes.map((collection) => (
                  <div key={collection.id} className="flex flex-col gap-3">
                    {collection.editorialNote && (
                      <div className="text-sm text-(--ink-2) italic leading-relaxed line-clamp-3">
                        {collection.editorialNote}
                      </div>
                    )}
                    <CollectionFlipCard collection={collection} />
                  </div>
                ))}
              </div>

              {/* Остальные коллекции без заметки */}
              {featuredWithoutNotes.length > 0 && (
                <div className="mb-4 mt-10">
                  <h2 className="text-lg font-semibold mb-3">Ещё подборки</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[200px]">
                    {featuredWithoutNotes.map((collection) => (
                      <CollectionFlipCard key={collection.id} collection={collection} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* CTA баннер */}
          <div className="mt-12 brutal-card brutal-border p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Создай свой рейтинг книг</h2>
            <p className="text-(--ink-2) mb-6 max-w-lg mx-auto">
              Собери собственную подборку любимых книг в формате тир-листа и поделись с сообществом.
            </p>
            {isAuthenticated ? (
              <Link
                to="/templates"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100"
              >
                <Plus size={18} />
                Создать тир-лист
              </Link>
            ) : (
              <Link
                to="/auth?mode=register"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100"
              >
                <TrendingUp size={18} />
                Создать аккаунт
              </Link>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
