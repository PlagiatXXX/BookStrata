import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, BookOpen } from "lucide-react";
import type { TierListShort } from "@/lib/tierListApi";
import { booksCountText } from "@/lib/plural";
import { proxyImageUrl } from "@/utils/imageProxy";
import "@/components/DashboardHeroSection/components/RecentPublicTierLists.css";

interface PublicTierListCardsProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<string>;
}

const GRADIENTS = [
  "linear-gradient(135deg, #06bcf9 0%, #08a8e0 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
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
    <div className="recent-tier-lists__grid">
      {tierLists.map((tierList) => {
        const isLiked = likedIdsSet.has(tierList.id);
        const gradient = hashGradient(tierList.title);
        return (
          <button
            key={tierList.id}
            className="recent-tier-card"
            onClick={() =>
              navigate(`/tier-lists/${tierList.slug || tierList.id}`)
            }
            type="button"
          >
            {tierList.coverImageUrl ? (
              <div
                className="recent-tier-card__bg recent-tier-card__bg--cover"
                style={{
                  backgroundImage: `url(${proxyImageUrl(tierList.coverImageUrl)})`,
                }}
              />
            ) : (
              <div
                className="recent-tier-card__bg"
                style={{ background: gradient }}
              >
                <span className="recent-tier-card__initial">
                  {tierList.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="recent-tier-card__overlay" />
            <div className="recent-tier-card__content">
              <p className="recent-tier-card__title">{tierList.title}</p>
              <p className="recent-tier-card__author">
                {tierList.authorName ||
                  tierList.user?.username ||
                  "Неизвестный автор"}
              </p>
              <div className="recent-tier-card__stats">
                <span className="recent-tier-card__stat">
                  <Heart
                    size={12}
                    className={
                      isLiked ? "fill-pink-500 text-pink-500" : undefined
                    }
                  />
                  {tierList.likesCount || 0}
                </span>
                <span className="recent-tier-card__stat">
                  <BookOpen size={12} />
                  {booksCountText(tierList.booksCount || 0)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

export default PublicTierListCards;
