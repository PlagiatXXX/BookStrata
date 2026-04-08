import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
  hasNextPage?: boolean;
  pageNumbers?: (number | 'ellipsis' | -1)[];
  variant?: 'cyan' | 'ghost';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isFetching = false,
  hasNextPage,
  pageNumbers,
  variant = 'cyan'
}) => {
  if (totalPages <= 1) return null;

  const actualHasNext = hasNextPage ?? (currentPage < totalPages);

  // Helper to generate page numbers with ellipsis if not provided
  const getPages = () => {
    if (pageNumbers) return pageNumbers;
    
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1; 
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        (i === currentPage - delta - 1) || 
        (i === currentPage + delta + 1)
      ) {
        pages.push('ellipsis');
      }
    }
    return pages.filter((v, i, a) => v !== 'ellipsis' || a[i-1] !== 'ellipsis');
  };

  if (variant === 'ghost') {
    return (
      <nav className="dashboard-pagination" aria-label="Пагинация">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isFetching}
          className="dashboard-btn dashboard-btn--ghost"
          type="button"
        >
          <ChevronLeft size={16} />
          Назад
        </button>

        <span className="text-sm font-medium">
          Страница {currentPage} из {totalPages}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={!actualHasNext || isFetching}
          className="dashboard-btn dashboard-btn--ghost"
          type="button"
        >
          Вперёд
          <ChevronRight size={16} />
        </button>
      </nav>
    );
  }

  // Cyan variant
  return (
    <nav className="mt-6 flex flex-col items-center justify-center gap-3" aria-label="Пагинация">
      <div className="text-xs opacity-70">
        Страница <span className="font-semibold text-cyan-100">{currentPage}</span> из <span className="font-semibold text-cyan-100">{totalPages}</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isFetching}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={16} />
        </button>

        {getPages().map((page, index) =>
          page === 'ellipsis' || page === -1 ? (
            <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
              <MoreHorizontal size={16} />
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page as number)}
              disabled={isFetching}
              aria-current={currentPage === page ? 'page' : undefined}
              className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                currentPage === page
                  ? 'border-cyan-300/80 bg-cyan-500/25 text-cyan-100'
                  : 'border-cyan-800/80 bg-[#08293c] text-cyan-100 hover:bg-[#0b3550]'
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!actualHasNext || isFetching}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Следующая страница"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};
