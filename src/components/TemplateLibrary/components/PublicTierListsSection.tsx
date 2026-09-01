
import { Spinner } from "@/components/Spinner";
import PublicTierListCards from "../PublicTierListCards";
import { EmptyState } from "./EmptyState";
import type { TierListShort } from "@/lib/tierListApi";

interface PublicTierListsSectionProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<string>;
  isLoading: boolean;
  isFetching: boolean;
  currentPage: number;
  pageNumbers: (number | -1)[];
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}

export function PublicTierListsSection({
  tierLists,
  likedIdsSet,
  isLoading,
  currentPage,
  pageNumbers,
  hasNextPage,
  onPageChange,
}: PublicTierListsSectionProps) {
  if (isLoading) {
    return (
      <div className="tpl-loading">
        <Spinner size="md" className="mr-2" />
        Загрузка...
      </div>
    );
  }

  if (tierLists.length === 0) {
    return <EmptyState section="public" hasSearch={false} />;
  }

  return (
    <>
      <PublicTierListCards
        tierLists={tierLists}
        likedIdsSet={likedIdsSet}
      />

      {/* Pagination */}
      <nav className="tpl-pagination" aria-label="Пагинация">
        <button
          className="tpl-pagination__arrow"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          type="button"
        >
          ← Назад
        </button>

        <div className="tpl-pagination__pages">
          {pageNumbers.map((page, idx) =>
            page === -1 ? (
              <span key={`dots-${idx}`} className="tpl-pagination__dots">...</span>
            ) : (
              <button
                key={page}
                className={`tpl-pagination__page ${currentPage === page ? 'tpl-pagination__page--active' : ''}`}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          className="tpl-pagination__arrow"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          type="button"
        >
          Вперед →
        </button>
      </nav>
    </>
  );
}
