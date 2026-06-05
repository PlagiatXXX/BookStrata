import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Heart, BookOpen } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import PublicTierListCards from "../PublicTierListCards";
import { Pagination } from "@/ui/Pagination";
import { EmptyState } from "./EmptyState";
import { booksCountText } from "@/lib/plural";
import type { TierListShort } from "@/lib/tierListApi";
import "@/components/DashboardHeroSection/components/RecentPublicTierLists.css";

interface PublicTierListsSectionProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<string>;
  isLoading: boolean;
  isFetching: boolean;
  currentPage: number;
  totalPages: number;
  pageNumbers: (number | -1)[];
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}

export function PublicTierListsSection({
  tierLists,
  likedIdsSet,
  isLoading,
  isFetching,
  currentPage,
  totalPages,
  pageNumbers,
  hasNextPage,
  onPageChange,
}: PublicTierListsSectionProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const featuredTierLists = useMemo(() => tierLists.slice(0, 4), [tierLists]);
  const restTierLists = useMemo(() => tierLists.slice(4), [tierLists]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-300">
        <Spinner size="md" className="mr-2" />
        Загрузка...
      </div>
    );
  }

  if (tierLists.length === 0) {
    return <EmptyState section="public" hasSearch={false} />;
  }

  const isFirstPage = currentPage === 1;

  return (
    <>
      {/* Hero: первые 4 популярных тир-листа (только на 1-й странице) */}
      {isFirstPage && featuredTierLists.length > 0 && (
        <section className="recent-tier-lists">
          <div className="recent-tier-lists__container" style={{ padding: 0 }}>
            <div className="recent-tier-lists__header">
              <h2 className="recent-tier-lists__title">
                Популярные тир-листы
              </h2>
            </div>

            <div className="recent-tier-lists__grid">
              {featuredTierLists.map((tierList) => {
                const gradient = hashGradient(tierList.title);
                return (
                  <button
                    key={tierList.id}
                    className="recent-tier-card"
                    onClick={() => navigate(`/tier-lists/${tierList.id}`)}
                    type="button"
                  >
                    {tierList.coverImageUrl ? (
                      <div
                        className="recent-tier-card__bg recent-tier-card__bg--cover"
                        style={{ backgroundImage: `url(${tierList.coverImageUrl})` }}
                      />
                    ) : (
                      <div className="recent-tier-card__bg" style={{ background: gradient }}>
                        <span className="recent-tier-card__initial">
                          {tierList.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="recent-tier-card__overlay" />
                    <div className="recent-tier-card__content">
                      <p className="recent-tier-card__title">{tierList.title}</p>
                      <p className="recent-tier-card__author">
                        {tierList.authorName || tierList.user?.username || "Неизвестный автор"}
                      </p>
                      <div className="recent-tier-card__stats">
                        <span className="recent-tier-card__stat">
                          <Heart size={12} />
                          {tierList.likesCount || 0}
                        </span>
                        <span className="recent-tier-card__stat">
                          <BookOpen size={12} />
                          {booksCountText(tierList.booksCount || 0)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Кнопка «Смотреть все» / «Свернуть» (только на 1-й странице, если есть ещё тир-листы) */}
      {isFirstPage && restTierLists.length > 0 && (
        <div className="flex justify-center mt-4 mb-6">
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-cyan-700/50 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-900/50 transition-colors cursor-pointer"
            type="button"
          >
            {showAll ? (
              <>
                <ChevronUp size={18} />
                Свернуть
              </>
            ) : (
              <>
                <ChevronDown size={18} />
                Смотреть все — ещё {restTierLists.length}
              </>
            )}
          </button>
        </div>
      )}

      {/* Остальные тир-листы (кроме featured) — только если showAll или не 1-я страница */}
      {isFirstPage && showAll && restTierLists.length > 0 && (
        <div>
          <PublicTierListCards tierLists={restTierLists} likedIdsSet={likedIdsSet} />
        </div>
      )}

      {/* На страницах > 1 — показываем все тир-листы как обычно, без hero */}
      {!isFirstPage && (
        <div>
          <PublicTierListCards tierLists={tierLists} likedIdsSet={likedIdsSet} />
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        isFetching={isFetching}
        pageNumbers={pageNumbers}
        hasNextPage={hasNextPage}
      />
    </>
  );
}

const GRADIENTS = [
  "linear-gradient(135deg, #06bcf9 0%, #08a8e0 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

function hashGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
