import { memo } from "react";
import { Sword, Users, Calendar } from "lucide-react";
import { type Battle } from "@/types/battles";
import { Link } from "react-router-dom";

interface BattleCardProps {
  battle: Battle;
}

export const BattleCard = memo(({ battle }: BattleCardProps) => {
  const endDate = new Date(battle.endTime).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  const totalVotes = battle.participants.reduce(
    (acc, p) => acc + (p.votesCount || 0),
    0,
  );

  return (
    <div className="brutal-card brutal-border p-6 hover-lift bg-(--bg-1) relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sword size={48} className="rotate-12" />
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--ink-1) mb-3">
        <span className="brutal-label px-2 py-0.5 bg-(--accent-main)/10 text-(--accent-main) border-(--accent-main)/30">
          {battle.type === "weekly" ? "Еженедельная" : "Ежемесячная"}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          до {endDate}
        </span>
      </div>

      <h3 className="community-heading text-xl font-bold leading-snug mb-2 pr-10">
        {battle.title}
      </h3>

      {battle.description && (
        <p className="text-(--ink-1) text-sm mb-4 line-clamp-2">
          {battle.description}
        </p>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="flex -space-x-2">
          {battle.participants.slice(0, 4).map((p) => {
            const user = p.tierList?.user
            return (
              <div
                key={p.id}
                className="w-10 h-10 rounded-full border-2 border-(--bg-0) bg-(--bg-2) overflow-hidden brutal-shadow-sm transition-transform hover:scale-110 hover:z-10"
                title={p.tierList.title}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={p.tierList.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-(--ink-1) text-[10px] font-bold">
                    {user?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            )
          })}
          {battle.participants.length > 4 && (
            <div className="w-10 h-10 rounded-full border-2 border-(--bg-0) bg-(--ink-0) text-(--bg-0) flex items-center justify-center text-[10px] font-bold z-0">
              +{battle.participants.length - 4}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs font-bold text-(--ink-0)">
            <Users size={14} className="text-(--accent-main)" />
            {totalVotes}
          </div>
          <div className="text-[8px] uppercase tracking-widest text-(--ink-1) font-bold">Голосов</div>
        </div>
      </div>

      <Link
        to={`/forum/battles/${battle.id}`}
        className="w-full block text-center brutal-cta py-3 text-[10px] font-bold uppercase tracking-widest"
      >
        Смотреть битву
      </Link>
    </div>
  );
});
