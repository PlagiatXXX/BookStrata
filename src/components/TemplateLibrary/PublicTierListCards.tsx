import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Calendar } from "lucide-react";
import type { TierListShort } from '@/lib/tierListApi';

interface PublicTierListCardsProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<number>;
}

const PublicTierListCards = memo(function PublicTierListCards({
  tierLists,
  likedIdsSet,
}: PublicTierListCardsProps) {
  const navigate = useNavigate();

  const handleCardClick = useCallback((id: number) => {
    navigate(`/tier-lists/${id}`);
  }, [navigate]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {tierLists.map((tierList) => (
        <div
          key={tierList.id}
          onClick={() => handleCardClick(tierList.id)}
          className="cursor-pointer bg-black/45 backdrop-blur-[2px] rounded-md p-3 border border-white/20 hover:border-white/40 transition-transform duration-200 min-h-22.5"
        >
          <h3 className="font-display font-semibold text-[#f3efe6] mb-1 text-sm line-clamp-1">
            {tierList.title}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#b8b1a3] truncate">
              {tierList.user?.username || "Unknown"}
            </span>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                  likedIdsSet.has(tierList.id)
                    ? "bg-pink-500/20 text-pink-300 border-pink-400/40"
                    : "bg-white/10 text-[#b8b1a3] border-white/20"
                }`}
              >
                <Heart size={12} className={`${likedIdsSet.has(tierList.id) ? "fill-current" : ""}`} />
                <span className="font-medium">{tierList.likesCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center mt-2 pt-2 border-t border-white/20">
            <Calendar size={12} className="text-[#b8b1a3] mr-1" />
            <span className="text-xs text-[#b8b1a3]">
              {new Date(tierList.updatedAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

export default PublicTierListCards;
