import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { PaginationProps } from '../types';

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="dashboard-pagination">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="dashboard-btn dashboard-btn--ghost"
        type="button"
      >
        <ArrowLeft size={16} />
        Назад
      </button>

      <span>
        Страница {currentPage} из {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="dashboard-btn dashboard-btn--ghost"
        type="button"
      >
        Вперёд
        <ArrowRight size={16} />
      </button>
    </nav>
  );
}
