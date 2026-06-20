import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Heart, BookOpen } from "lucide-react";
import type { TierListShort } from '@/lib/tierListApi';
import { TierListCover } from "@/components/DashboardHeroSection/components/TierListCover";
import { booksCountText } from "@/lib/plural";

interface PublicTierListCardsProps {
  tierLists: TierListShort[];
  likedIdsSet: Set<string>;
}

const PublicTierListCards = memo(function PublicTierListCards({
  tierLists,
  likedIdsSet,
}: PublicTierListCardsProps) {
  const navigate = useNavigate();

  const handleCardClick = (id: string) => {
    navigate(`/tier-lists/${id}`);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {tierLists.map((tierList) => {
        const isLiked = likedIdsSet.has(tierList.id);
        const booksCount = tierList.booksCount || 0;

        return (
          <article
            key={tierList.id}
            className="group relative cursor-pointer rounded-xl border border-white/10 bg-[rgba(15,30,50,0.4)] p-4 backdrop-blur-[12px] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(6,188,249,0.3)] hover:shadow-xl"
            role="button"
            tabIndex={0}
            onClick={() => handleCardClick(tierList.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(tierList.id);
              }
            }}
          >
            {/* Cover */}
            <TierListCover
              coverImageUrl={tierList.coverImageUrl}
              title={tierList.title}
              booksCount={booksCount}
            />

            {/* Title */}
            <h3
              className="mt-3 mb-1 font-display font-semibold text-[#e2e8f0] leading-tight cursor-pointer hover:text-[#06bcf9] transition-colors line-clamp-2"
              title={`Открыть "${tierList.title}"`}
            >
              {tierList.title}
            </h3>

            {/* Author */}
            <div className="mb-3">
              {tierList.user?.id ? (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/users/${tierList.user!.id}`) }}
                  className="text-xs text-[#94a3b8] hover:text-[#06bcf9] transition-colors truncate text-left cursor-pointer"
                >
                  {tierList.user.username}
                </button>
              ) : (
                <span className="text-xs text-[#94a3b8] truncate block">
                  {tierList.authorName || "Неизвестный автор"}
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs">
                <Heart
                  className={`w-3.5 h-3.5 ${isLiked ? 'fill-pink-500 text-pink-500' : 'text-[#94a3b8]'}`}
                />
                <span className={`font-medium ${isLiked ? 'text-pink-500' : 'text-[#94a3b8]'}`}>
                  {tierList.likesCount || 0}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{booksCountText(booksCount)}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] ml-auto">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(tierList.updatedAt).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
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
