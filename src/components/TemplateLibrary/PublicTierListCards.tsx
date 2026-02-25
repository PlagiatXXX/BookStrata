import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import type { TierListShort } from '@/lib/tierListApi';
import { LikeButton } from "@/components/LikeButton";

interface PublicTierListCardsProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<number>;
  currentUserId?: number;
}

const PublicTierListCards = memo(function PublicTierListCards({
  tierLists,
  likedIdsSet,
  currentUserId,
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
              {tierList.user?.username || "Неизвестный автор"}
            </span>
            <div className="flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <LikeButton
                  id={tierList.id}
                  type="tierlist"
                  initialLikes={tierList.likesCount || 0}
                  initialLiked={likedIdsSet.has(tierList.id)}
                  authorId={tierList.user?.id}
                  currentUserId={currentUserId}
                  size="sm"
                />
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
