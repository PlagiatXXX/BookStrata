import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import PublicTierListCards from "../PublicTierListCards";
import { Pagination } from "@/ui/Pagination";
import { EmptyState } from "./EmptyState";
import type { TierListShort } from "@/lib/tierListApi";
import "@/components/DashboardHeroSection/components/RecentPublicTierLists.css";

const INITIAL_VISIBLE = 4;

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
  const [showAll, setShowAll] = useState(false);

  // Сбрасываем showAll при смене страницы
  useEffect(() => {
    setShowAll(false);
  }, [currentPage]);

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

  const visibleTierLists = showAll
    ? tierLists
    : tierLists.slice(0, INITIAL_VISIBLE);

  const restCount = tierLists.length - INITIAL_VISIBLE;

  return (
    <>
      <section className="recent-tier-lists">
        <div className="recent-tier-lists__container" style={{ padding: 0 }}>
          <PublicTierListCards
            tierLists={visibleTierLists}
            likedIdsSet={likedIdsSet}
          />

          {/* Кнопка «Смотреть все» / «Свернуть» */}
          {restCount > 0 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cyan-700/50 bg-cyan-900/30 text-cyan-100 text-sm hover:bg-cyan-900/50 transition-colors cursor-pointer"
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
                    Смотреть все — ещё {restCount}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

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
