import { Clock, Edit2, Trash2, Globe, Lock } from 'lucide-react';
import type { TierListShort } from '@/lib/api';
import type { TierListCardProps } from '../types';
import { NEW_TIER_LIST_THRESHOLD_MS, DATE_FORMAT } from '../constants';

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

  return (
    <article className="dashboard-card">
      {/* Actions */}
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

      {/* Header */}
      <div className="dashboard-card__head">
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
        {isNew && <span className="dashboard-badge">Новый</span>}
      </div>

      {/* Meta */}
      <div className="dashboard-card__meta">
        <Clock size={15} />
        <span>
          {createdDate.toLocaleDateString('ru-RU', DATE_FORMAT)}
        </span>
      </div>

      {/* Tags */}
      <div className="dashboard-card__tags">
        {tierList.isPublic ? (
          <span className="dashboard-tag">
            <Globe size={14} />
            Публичный
          </span>
        ) : (
          <span className="dashboard-tag">
            <Lock size={14} />
            Приватный
          </span>
        )}
      </div>

      {/* Open button */}
      <button
        onClick={() => onOpen(tierList.id)}
        className="dashboard-btn dashboard-btn--primary dashboard-card__open"
        type="button"
      >
        Открыть
      </button>
    </article>
  );
}
