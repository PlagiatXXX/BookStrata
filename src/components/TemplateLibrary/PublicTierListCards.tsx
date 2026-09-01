import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import type { TierListShort } from "@/lib/tierListApi";
import { booksCountText } from "@/lib/plural";
import { proxyImageUrl } from "@/utils/imageProxy";

interface PublicTierListCardsProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<string>;
}

const GRADIENTS = [
  "linear-gradient(135deg, #d4af37 0%, #b8860b 100%)",
  "linear-gradient(135deg, #d4af37 0%, #8b6914 100%)",
  "linear-gradient(135deg, #c9a227 0%, #a67c00 100%)",
  "linear-gradient(135deg, #e6c35c 0%, #d4af37 100%)",
  "linear-gradient(135deg, #b8860b 0%, #8b6914 100%)",
  "linear-gradient(135deg, #d4af37 0%, #996515 100%)",
];

function hashGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

const PublicTierListCards = memo(function PublicTierListCards({
  tierLists,
  likedIdsSet,
}: PublicTierListCardsProps) {
  const navigate = useNavigate();

  return (
    <div className="tpl-card-grid">
      {tierLists.map((tierList) => {
        const isLiked = likedIdsSet.has(tierList.id);
        const gradient = hashGradient(tierList.title);
        return (
          <article
            key={tierList.id}
            className="tpl-card group"
            onClick={() =>
              navigate(`/tier-lists/${tierList.slug || tierList.id}`)
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate(`/tier-lists/${tierList.slug || tierList.id}`);
              }
            }}
          >
            <div className="tpl-card__image-wrap">
              {tierList.coverImageUrl ? (
                <img
                  alt={tierList.title}
                  className="tpl-card__image"
                  src={proxyImageUrl(tierList.coverImageUrl)}
                  loading="lazy"
                />
              ) : (
                <div
                  className="tpl-card__gradient"
                  style={{ background: gradient }}
                >
                  <span className="tpl-card__initial">
                    {tierList.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="tpl-card__meta">
              <div className="tpl-card__info">
                <h3 className="tpl-card__title">{tierList.title}</h3>
                <p className="tpl-card__author">
                  {tierList.authorName ||
                    tierList.user?.username ||
                    "Неизвестный автор"}
                </p>
              </div>
              <div className="tpl-card__stats">
                <span className="tpl-card__likes">
                  <Heart
                    size={14}
                    className={isLiked ? "fill-current" : ""}
                  />
                  {tierList.likesCount || 0}
                </span>
                <span className="tpl-card__count">
                  {booksCountText(tierList.booksCount || 0)}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
});

export default PublicTierListCards;
