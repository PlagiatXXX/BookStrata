import { useEffect, useCallback, memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { useAuth } from "@/hooks/useAuthContext";
import { apiGetUserStats } from "@/lib/userApi";
import { DashboardHeader } from "./components/DashboardHeader";
import { UserActivityStats } from "@/components/DashboardHeroSection/components/UserActivityStats";
import { DashboardAchievements } from "@/components/DashboardHeroSection/components/DashboardAchievements";
import { TrendingNow } from "@/components/DashboardHeroSection/components/TrendingNow";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";

import "./DashboardPage.css";
import logger from "@/lib/logger";


// Мемоизируем компоненты дашборда для предотвращения ререндеров
const MemoizedDashboardHeader = memo(DashboardHeader);
const MemoizedUserActivityStats = memo(UserActivityStats);


export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Отслеживаем изменения пользователя (например, обновление аватара)
 useEffect(() => {
    if (user) {
      logger.info("Пользователь в панели", {
        username: user.username,
        hasAvatar: !!user.avatarUrl,
        avatarUrl: user.avatarUrl?.substring(0, 50) + "...",
      });
    }
  }, [user]);

  const [isAiLibrarianOpen, setAiLibrarianOpen] = useState(false);

  // Data fetching - User stats
  const { data: stats } = useQuery({
    queryKey: ["user", "stats"],
    queryFn: apiGetUserStats,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });

  // Вычисляем значения для статистики
  const tierListsCount = stats?.tierListsCount || 0;
  const publishedCount = stats?.publishedCount || 0;
  const draftsCount = Math.max(0, tierListsCount - publishedCount);
  const totalBooks = stats?.totalBooks || 0;
  const likesCount = stats?.likesCount || 0;
  const lastActivity = stats?.lastActivity || null;

  // Стабилизируем обработчики для предотвращения ререндеров мемоизированных компонентов
  const handleMyRatingsClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  const handleCreateTierList = useCallback(() => {
    navigate("/templates");
  }, [navigate]);

  const handleCommunityClick = useCallback(() => navigate("/community"), [navigate]);
  const handleAiLibrarianOpen = useCallback(() => setAiLibrarianOpen(true), []);
  const handleAiLibrarianClose = useCallback(() => setAiLibrarianOpen(false), []);

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      showSearch={false}
    >
      <section className="dashboard-home">
        {/* Hero Section — full bleed на мобильных, центрирован на десктопе */}
        <MemoizedDashboardHeader
          username={user?.username || ""}
          onCreateClick={handleCreateTierList}
          onCommunityClick={handleCommunityClick}
          onLogoutClick={handleLogout}
        />

        <div className="dashboard-home__container">
          {/* AI Librarian Card */}
          <div className="mx-auto my-8 sm:my-12 max-w-3xl px-1 sm:px-0">
            <button
              onClick={handleAiLibrarianOpen}
              className="group flex w-full cursor-pointer items-center gap-3 sm:gap-5 border-2 border-black bg-[#111111] p-4 sm:p-6 text-left shadow-[6px_6px_0_0_#000000] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000000]"
              type="button"
            >
              <div className="flex size-10 sm:size-14 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-[#c1fffe]">
                <img src="/bukstrazh.webp" alt="Букстраж" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black tracking-[-0.02em] text-[#f6f1e8]">
                    Букстраж
                  </span>
                  <span className="rounded border border-[#c1fffe]/30 bg-[#c1fffe]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-[#c1fffe]">
                    AI
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-[#9aa1a3] line-clamp-2 sm:line-clamp-none">
                  Я проанализирую твои тир-листы и посоветую книги, которые тебе точно понравятся
                </p>
              </div>
              <div className="relative z-10 flex shrink-0 cursor-pointer items-center gap-1.5 sm:gap-2 px-3 sm:px-6 font-bold text-white transition-all duration-500 before:absolute before:-inset-[5px] before:-z-10 before:rounded-[35px] before:bg-gradient-to-r before:from-violet-500 before:from-10% before:via-sky-500 before:via-30% before:to-pink-500 before:bg-[length:400%] before:transition-all before:duration-500 before:ease-in-out hover:before:blur-xl hover:before:bg-[length:10%] h-[2.5em] sm:h-[3em] rounded-[30px] bg-gradient-to-r from-violet-500 from-10% via-sky-500 via-30% to-pink-500 to-90% bg-[length:400%] hover:animate-gradient-xy hover:bg-[length:100%] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:bg-violet-700 active:brightness-90 active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-violet-700">
                <span className="text-base sm:text-xl">🔮</span>
                <span className="text-[11px] sm:text-sm">Спросить</span>
              </div>
            </button>
          </div>

          {/* Stats Section */}
          <MemoizedUserActivityStats
            tierListsCount={tierListsCount}
            publishedCount={publishedCount}
            draftsCount={draftsCount}
            totalBooks={totalBooks}
            likesCount={likesCount}
            lastActivity={lastActivity}
          />

          {/* Achievements & XP */}
          <DashboardAchievements />

          {/* Trending Now */}
          <TrendingNow />
        </div>
      </section>

      <AiLibrarianModal
        isOpen={isAiLibrarianOpen}
        onClose={handleAiLibrarianClose}
      />
    </DashboardLayout>
  );
}
