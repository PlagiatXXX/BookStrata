import { Clock, Edit2, Trash2, Globe, Lock, CheckCircle2, CircleDashed } from 'lucide-react';
import type { TierListCardProps } from '../types';
import { NEW_TIER_LIST_THRESHOLD_MS, DATE_FORMAT } from '../constants';

const MAX_BOOKS = 20;

export function TierListCard({
  tierList,
  onOpen,
  onRename,
  onDelete,
}: TierListCardProps) {
  const createdDate = new Date(tierList.createdAt);
  const isNew =
    new Date().getTime() - createdDate.getTime() <
    NEW_TIER_LIST_THRESHOLD_MS;

  const booksCount = tierList.booksCount || 0;
  const progress = Math.min(100, Math.round((booksCount / MAX_BOOKS) * 100));
  const isComplete = booksCount >= MAX_BOOKS;

  return (
    <article className="dashboard-card">
      {/* Actions - top right */}
      <div className="dashboard-card__actions">
        <button
          onClick={() => onRename(tierList)}
          className="dashboard-card__rename"
          title="Переименовать"
          type="button"
          aria-label="Переименовать"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(tierList)}
          className="dashboard-card__delete"
          title="Удалить"
          type="button"
          aria-label="Удалить"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Status Badge - top left */}
      <div className="dashboard-card__status">
        {isComplete ? (
          <span className="dashboard-status-badge dashboard-status-badge--complete">
            <CheckCircle2 size={10} />
            Завершен
          </span>
        ) : (
          <span className="dashboard-status-badge dashboard-status-badge--progress">
            <CircleDashed size={10} />
            В процессе
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        role="button"
        tabIndex={0}
        onClick={() => onOpen(tierList.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(tierList.id);
          }
        }}
        className="dashboard-card__title cursor-pointer"
      >
        {tierList.title}
      </h3>

      {/* Meta */}
      <div className="dashboard-card__meta">
        <Clock size={15} />
        <span>
          {createdDate.toLocaleDateString('ru-RU', DATE_FORMAT)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="dashboard-card__progress">
        <div className="dashboard-card__progress-header">
          <span className="dashboard-card__progress-label">Прогресс заполнения</span>
          <span className="dashboard-card__progress-value">{progress}%</span>
        </div>
        <div className="dashboard-card__progress-bar">
          <div 
            className="dashboard-card__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer with visibility and open button */}
      <div className="dashboard-card__footer">
        <div className="dashboard-card__visibility">
          {tierList.isPublic ? (
            <span className="dashboard-tag dashboard-tag--public">
              <Globe size={12} />
              Публичный
            </span>
          ) : (
            <span className="dashboard-tag dashboard-tag--private">
              <Lock size={12} />
              Приватный
            </span>
          )}
        </div>
        <button
          onClick={() => onOpen(tierList.id)}
          className="dashboard-btn dashboard-btn--primary dashboard-card__open"
          type="button"
        >
          Открыть
        </button>
      </div>
    </article>
  );
}
