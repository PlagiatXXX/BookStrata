import { Spinner } from '@/components/Spinner';
import PublicTierListCards from '../PublicTierListCards';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import type { TierListShort } from '@/lib/tierListApi';

interface PublicTierListsSectionProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<number>;
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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-300">
        <Spinner size="md" className="mr-2" />
        Загрузка...
      </div>
    );
  }

  if (tierLists.length === 0) {
    return <EmptyState section="public" hasSearch={false} searchQuery="" />;
  }

  return (
    <>
      <PublicTierListCards tierLists={tierLists} likedIdsSet={likedIdsSet} />

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
