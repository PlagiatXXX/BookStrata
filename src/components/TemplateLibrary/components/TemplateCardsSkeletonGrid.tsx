import { memo } from "react";
import { PUBLIC_PAGE_SIZE } from "../constants";

interface TemplateCardsSkeletonGridProps {
  count?: number;
}

export const TemplateCardsSkeletonGrid = memo(function TemplateCardsSkeletonGrid({
  count = PUBLIC_PAGE_SIZE,
}: TemplateCardsSkeletonGridProps) {
  return (
    <div
      className="tpl-card-grid"
      data-testid="tpl-skeleton-grid"
      aria-busy="true"
      aria-label="Загрузка тир-листов"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="tpl-card pointer-events-none" aria-hidden="true">
          <div className="tpl-card__image-wrap animate-pulse bg-white/5" />
          <div className="tpl-card__meta">
            <div className="tpl-card__info">
              <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3.5 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="tpl-card__stats">
              <div className="h-3.5 w-10 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
