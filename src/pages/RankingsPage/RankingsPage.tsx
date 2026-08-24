import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { getFeaturedCollections } from "@/lib/collectionsApi";
import { getTrendingBooks } from "@/lib/bookApi";
import { RankingsHero } from "./components/RankingsHero";
import { TrendingBooksCarousel } from "./components/TrendingBooksCarousel";
import { NeonFlipCollectionCard } from "./components/NeonFlipCollectionCard";
import { GenreNavigation } from "./components/GenreNavigation";
import { CreateRatingCta } from "./components/CreateRatingCta";

export default function RankingsPage() {
  const [isAiOpen, setAiOpen] = useState(false);
  const handleAiOpen = useCallback(() => setAiOpen(true), []);
  const handleAiClose = useCallback(() => setAiOpen(false), []);

  const { data: collections = [], isLoading: collLoading, isError: collError } = useQuery({
    queryKey: ["featured-collections"],
    queryFn: getFeaturedCollections,
    staleTime: 120_000,
  });

  const { data: trendingBooks = [] } = useQuery({
    queryKey: ["trending-books"],
    queryFn: getTrendingBooks,
    staleTime: 300_000,
  });

  return (
    <>
      <SEOHead
        title="Рейтинг книг — лучшие книги и что почитать"
        description="Редакционные подборки BookStrata: лучшие книги в жанрах, составленные редакцией."
        url="/rankings"
        breadcrumbs={[{ name: "Главная", url: "/" }, { name: "Рейтинг книг", url: "/rankings" }]}
      />
      <DashboardLayout showSearch={false}>
        <RankingsHero onAiOpen={handleAiOpen} />

        {trendingBooks.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 md:px-16 pt-1 pb-8">
            <TrendingBooksCarousel books={trendingBooks} />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 md:px-16 py-8">
          {collLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse h-64 rounded-xl bg-white/5" />
              ))}
            </div>
          ) : collError ? (
            <p className="text-center text-red-400/80 py-12">Не удалось загрузить подборки</p>
          ) : collections.length === 0 ? (
            <p className="text-center text-white/40 py-12">Редакционные подборки готовятся</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {collections.map((collection, i) => (
                <NeonFlipCollectionCard key={collection.id} collection={collection} index={i} />
              ))}
            </div>
          )}
        </div>

        <GenreNavigation />
        <CreateRatingCta />
      </DashboardLayout>

      <AiLibrarianModal isOpen={isAiOpen} onClose={handleAiClose} context={{ pageType: "rankings" }} />
    </>
  );
}
