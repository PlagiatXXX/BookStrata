import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationProps } from '../types';

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isFetching,
  pageNumbers,
  hasNextPage,
}: PaginationProps & { pageNumbers: (number | -1)[]; hasNextPage: boolean }) {
  return (
    <nav
      className="mt-6 flex flex-col items-center justify-center gap-3"
      aria-label="Пагинация"
    >
      {/* Информация о странице */}
      <div className="text-xs text-[#b8b1a3]">
        Страница{' '}
        <span className="font-semibold text-cyan-100">{currentPage}</span>{' '}
        из{' '}
        <span className="font-semibold text-cyan-100">{totalPages}</span>
      </div>

      {/* Кнопки пагинации */}
      <div className="flex items-center justify-center gap-2">
        {/* Предыдущая */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isFetching}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Номера страниц */}
        {pageNumbers.map((page, index) =>
          page === -1 ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
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
          ),
        )}

        {/* Следующая */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || isFetching}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Следующая страница"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
