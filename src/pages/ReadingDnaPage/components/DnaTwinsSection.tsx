import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, User, Layers, Swords, ArrowUpRight } from "lucide-react";
import { getReadingTwins, type ReadingDnaTwinData } from "@/lib/readingDnaApi";
import type { DnaTheme } from "../ReadingDnaPage";

export interface DnaTwinsSectionProps {
  ticketNumber: string;
  theme: DnaTheme;
}

/**
 * Блок «Книжные близнецы» на экране билета Reading DNA:
 * показывает реальных читателей с похожим вкусом и ведёт в их профили, тир-листы и дуэли.
 */
export function DnaTwinsSection({ ticketNumber, theme }: DnaTwinsSectionProps) {
  const isDark = theme === "dark";

  const { data, isLoading } = useQuery({
    queryKey: ["readingDna", "twins", ticketNumber],
    queryFn: () => getReadingTwins(ticketNumber, 4),
    enabled: Boolean(ticketNumber),
    staleTime: 5 * 60_000,
  });

  const twins: ReadingDnaTwinData[] = data?.twins ?? [];

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-xl border space-y-3.5 ${
        isDark
          ? "bg-[#2b1d14]/70 border-[rgba(201,163,91,0.3)] text-[#efe3cc]"
          : "bg-white/85 border-[rgba(59,110,168,0.28)] text-[#2e2a24]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] sm:text-xs uppercase font-mono tracking-wider opacity-60 flex items-center gap-1.5">
            <Users size={12} />
            <span>Книжные близнецы</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold mt-0.5">
            Читатели с похожим вкусом на BookStrata
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-current/10 animate-pulse"
            />
          ))}
        </div>
      ) : twins.length === 0 ? (
        <p className="text-xs opacity-75 leading-relaxed py-1">
          Пока рядом по 6 осям никого не нашлось — вы среди первых читателей со своим профилем вкуса.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {twins.map((twin) => {
            const displayName =
              twin.customName?.trim() || twin.user?.username || "Читатель";
            const initial = displayName.slice(0, 1).toUpperCase();
            const tierListUrl = twin.topTierList
              ? `/tier-lists/${twin.topTierList.slug || twin.topTierList.id}`
              : null;

            return (
              <div
                key={twin.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                  isDark
                    ? "bg-[#1e130c]/70 border-[rgba(201,163,91,0.24)] hover:border-[rgba(201,163,91,0.5)]"
                    : "bg-[#fbf8f2] border-[rgba(59,110,168,0.24)] hover:border-[rgba(59,110,168,0.5)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {twin.user?.avatarUrl ? (
                      <img
                        src={twin.user.avatarUrl}
                        alt={displayName}
                        loading="lazy"
                        className="w-9 h-9 rounded-full object-cover border border-current/20 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                          isDark
                            ? "bg-[#35261b] border-[rgba(201,163,91,0.35)] text-[#f3d999]"
                            : "bg-white border-[rgba(59,110,168,0.3)] text-[#3b6ea8]"
                        }`}
                      >
                        {initial}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] opacity-70 truncate">
                        {twin.archetypeName} · #{twin.ticketNumber}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      isDark
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {twin.similarity}%
                  </span>
                </div>

                {/* Топ-тирлист близнеца, если есть */}
                {twin.topTierList && tierListUrl && (
                  <Link
                    to={tierListUrl}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      isDark
                        ? "bg-[#2b1d14]/80 border-[rgba(201,163,91,0.2)] hover:border-[rgba(201,163,91,0.5)]"
                        : "bg-white border-[rgba(59,110,168,0.2)] hover:border-[rgba(59,110,168,0.5)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Layers size={12} className="shrink-0 opacity-70" />
                      <span className="truncate font-medium">
                        {twin.topTierList.title}
                      </span>
                    </span>
                    <ArrowUpRight size={12} className="shrink-0 opacity-65" />
                  </Link>
                )}

                {/* Навигация: Профиль, Билет, Дуэль */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-current/10 text-[11px] font-semibold">
                  {twin.user && (
                    <Link
                      to={`/users/${twin.user.id}`}
                      className={`inline-flex items-center gap-1 hover:underline ${
                        isDark ? "text-[#f3d999]" : "text-[#3b6ea8]"
                      }`}
                    >
                      <User size={12} />
                      <span>Профиль</span>
                    </Link>
                  )}

                  <Link
                    to={`/reading-dna?ticket=${twin.ticketNumber}`}
                    className="inline-flex items-center gap-1 opacity-80 hover:opacity-100 hover:underline"
                  >
                    <span>Билет</span>
                    <ArrowUpRight size={11} />
                  </Link>

                  <Link
                    to={`/reading-dna?challenge=${twin.ticketNumber}`}
                    className={`ml-auto inline-flex items-center gap-1 hover:underline ${
                      isDark ? "text-rose-300" : "text-[#b3412f]"
                    }`}
                  >
                    <Swords size={12} />
                    <span>Сравнить</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
