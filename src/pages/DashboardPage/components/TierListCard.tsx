import { memo } from "react";
import {
  Clock,
  Edit2,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import type { TierListCardProps } from "../types";
import { TierListCover } from "@/components/DashboardHeroSection/components/TierListCover";

export const TierListCard = memo(
  ({ tierList, onOpen, onRename, onDelete }: TierListCardProps) => {
    const createdDate = new Date(tierList.createdAt);
    const booksCount = tierList.booksCount || 0;

    return (
      <article className="dashboard-card">
        {/* Cover */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpen(tierList.slug || tierList.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(tierList.slug || tierList.id);
            }
          }}
          className="cursor-pointer"
        >
          <TierListCover
            coverImageUrl={tierList.coverImageUrl}
            title={tierList.title}
            booksCount={booksCount}
          />
        </div>

        {/* Actions - top right */}
        <div className="dashboard-card__actions">
          <button
            onClick={() => onRename(tierList)}
            className="dashboard-card__rename"
            title={`Переименовать "${tierList.title}"`}
            type="button"
            aria-label={`Переименовать "${tierList.title}"`}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(tierList)}
            className="dashboard-card__delete"
            title={`Удалить "${tierList.title}"`}
            type="button"
            aria-label={`Удалить "${tierList.title}"`}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Title */}
        <h3
          role="button"
          tabIndex={0}
          onClick={() => onOpen(tierList.slug || tierList.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(tierList.slug || tierList.id);
            }
          }}
          className="dashboard-card__title cursor-pointer"
          title={`Открыть "${tierList.title}"`}
          aria-label={`Открыть тир-лист: ${tierList.title}`}
        >
          {tierList.title}
        </h3>

        {/* Meta */}
        <div className="dashboard-card__meta">
          <Clock size={15} />
          <span>{createdDate.toLocaleDateString("ru-RU")}</span>
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
            onClick={() => onOpen(tierList.slug || tierList.id)}
            className="dashboard-btn dashboard-btn--primary dashboard-card__open"
            type="button"
          >
            Открыть
          </button>
        </div>
      </article>
    );
  },
);