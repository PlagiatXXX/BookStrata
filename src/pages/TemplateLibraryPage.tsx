import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Globe, PlusCircle } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { useTheme } from "@/hooks/useTheme";
import TemplateLibrary from "@/components/TemplateLibrary/TemplateLibrary";
import { getPublicTierLists } from "@/lib/api";
import { apiGetLikedTierListIds } from "@/lib/likesApi";
import { Spinner } from "@/components/Spinner";
import PublicTierListCards from "@/components/TemplateLibrary/PublicTierListCards";

const TemplateLibraryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: publicTierListsData,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingPublicTierLists,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["publicTierListsSorted", "likes"],
    queryFn: ({ pageParam = 1 }) => getPublicTierLists(pageParam, 6, "likes"),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.currentPage < lastPage.meta.totalPages) {
        return lastPage.meta.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: likedTierListIds } = useQuery({
    queryKey: ["likedTierListIds"],
    queryFn: () => apiGetLikedTierListIds(),
    refetchOnWindowFocus: true,
  });

  const likedIdsSet = useMemo(
    () => new Set(likedTierListIds?.likedIds || []),
    [likedTierListIds?.likedIds],
  );

  const allPublicTierLists = useMemo(() => {
    return publicTierListsData?.pages.flatMap((page) => page.data) || [];
  }, [publicTierListsData]);

  const handleMyRatingsClick = () => {
    setSearchQuery("");
    navigate("/");
  };

  const handleLoadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      onSearch={(query) => setSearchQuery(query)}
      searchValue={searchQuery}
      showTemplatesNav={true}
      showThemeToggle={false}
      showSearch={false}
      activeItem="Шаблоны"
    >
      <section className="relative min-h-screen bg-[url('/templates.webp')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(10,10,10,0.82)_0%,rgba(18,18,18,0.76)_45%,rgba(10,10,10,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(217,79,43,0.18),transparent_36%),radial-gradient(circle_at_85%_80%,rgba(47,107,95,0.2),transparent_38%)]" />

        <div className="relative overflow-hidden px-4 lg:px-8 pt-8 pb-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <button
                onClick={handleMyRatingsClick}
                className="group flex items-center gap-2 px-5 py-2.5 bg-black/40 hover:bg-black/55 border border-white/30 hover:border-white/55 rounded-md text-[#f3efe6] transition-all duration-200 cursor-pointer"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">На главную</span>
              </button>

              <button
                onClick={() => navigate("/templates/new")}
                className="group flex items-center gap-2 px-5 py-2.5 bg-[#f3efe6] hover:bg-[#d94f2b] border border-[#f3efe6] hover:border-[#d94f2b] rounded-md text-[#121212] hover:text-[#f3efe6] transition-all duration-200 cursor-pointer"
              >
                <PlusCircle size={20} className="group-hover:translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium">Создать шаблон</span>
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1
                  className={`font-display text-4xl lg:text-5xl font-bold tracking-tight ${
                    theme === "light" ? "text-slate-900" : "text-[#f3efe6]"
                  } mb-2`}
                >
                  Мои шаблоны
                </h1>
                <p className={`text-sm ${theme === "light" ? "text-slate-700" : "text-[#b8b1a3]"}`}>
                  Создавайте и управляйте шаблонами для быстрого создания тир-листов
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative px-4 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2
                className={`font-display text-2xl font-semibold tracking-tight ${
                  theme === "light" ? "text-slate-900" : "text-[#f3efe6]"
                } mb-2`}
              >
                Ваши шаблоны
              </h2>
              <div className="h-0.5 w-20 bg-(--accent-main)"></div>
            </div>

            <TemplateLibrary />

            <div className="mt-12">
              <h2
                className={`font-display text-2xl font-semibold tracking-tight ${
                  theme === "light" ? "text-slate-900" : "text-[#f3efe6]"
                } mb-2`}
              >
                Публичные тир-листы
              </h2>
              <div className="h-0.5 w-20 bg-(--accent-main) mb-6"></div>

              {isLoadingPublicTierLists ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-300 flex items-center">
                    <Spinner size="md" className="mr-2" />
                    Загрузка...
                  </div>
                </div>
              ) : allPublicTierLists.length === 0 ? (
                <div className="text-center py-12 text-gray-300">
                  <Globe size={40} className="mb-4 mx-auto opacity-50" />
                  <p>Пока нет публичных тир-листов</p>
                </div>
              ) : (
                <>
                  <PublicTierListCards
                    tierLists={allPublicTierLists}
                    likedIdsSet={likedIdsSet}
                  />

                  {hasNextPage && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={isFetchingNextPage}
                        className="px-6 py-3 bg-[#f3efe6] hover:bg-[#d94f2b] border border-[#f3efe6] hover:border-[#d94f2b] text-[#121212] hover:text-[#f3efe6] rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFetchingNextPage ? (
                          <div className="flex items-center justify-center">
                            <Spinner size="sm" className="mr-2" />
                            Загрузка...
                          </div>
                        ) : (
                          "Показать еще"
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default TemplateLibraryPage;
