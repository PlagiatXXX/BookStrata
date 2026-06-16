import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Heart, BookOpen } from "lucide-react";
import { getPublicTierLists } from "@/lib/tierListApi";
import type { TierListShort } from "@/lib/tierListApi";
import { proxyImageUrl } from "@/utils/imageProxy";
import "./RecentPublicTierLists.css";

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

function TierListCard({ tierList }: { tierList: TierListShort }) {
  const navigate = useNavigate();
  const gradient = hashGradient(tierList.title);

  return (
    <button
      className="recent-tier-card"
      onClick={() => navigate(`/tier-lists/${tierList.id}`)}
      type="button"
    >
      {tierList.coverImageUrl ? (
        <div
          className="recent-tier-card__bg recent-tier-card__bg--cover"
          style={{ backgroundImage: `url(${proxyImageUrl(tierList.coverImageUrl)})` }}
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
          {tierList.authorName || tierList.user?.username || "Неизвестный автор"}
        </p>
        <div className="recent-tier-card__stats">
          <span className="recent-tier-card__stat">
            <Heart size={12} />
            {tierList.likesCount || 0}
          </span>
          <span className="recent-tier-card__stat">
            <BookOpen size={12} />
            {tierList.booksCount || 0}
          </span>
        </div>
      </div>
    </button>
  );
}

export function RecentPublicTierLists() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["recentPublicTierLists"],
    queryFn: () => getPublicTierLists(1, 4, "likes"),
    staleTime: 2 * 60 * 1000,
  });

  const tierLists = data?.data?.slice(0, 4) || [];

  if (isLoading) {
    return null;
  }

  if (tierLists.length === 0) {
    return null;
  }

  return (
    <section className="recent-tier-lists">
      <div className="recent-tier-lists__container">
        <div className="recent-tier-lists__header">
          <h2 className="recent-tier-lists__title">
            Популярные тир-листы
          </h2>
          <button
            className="recent-tier-lists__link"
            onClick={() => navigate("/templates?section=public")}
            type="button"
          >
            Смотреть все →
          </button>
        </div>

        <div className="recent-tier-lists__grid">
          {tierLists.map((tierList) => (
            <TierListCard key={tierList.id} tierList={tierList} />
          ))}
        </div>
      </div>
    </section>
  );
}
