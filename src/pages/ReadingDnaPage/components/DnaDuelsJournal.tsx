import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Flame, Swords, Copy, AlertTriangle } from "lucide-react";
import {
  getTicketDuels,
  type ReadingDnaDuelEntryData,
} from "@/lib/readingDnaApi";
import type { DnaTheme } from "../ReadingDnaPage";

export interface DnaDuelsJournalProps {
  ticketNumber: string;
  isOtherTicket?: boolean;
  theme: DnaTheme;
  onCopyChallengeLink?: () => void;
  onOpenDuel?: (opponentTicketNumber: string) => void;
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function HighlightCard({
  kind,
  entry,
  isDark,
  onOpenDuel,
}: {
  kind: "best" | "antagonist";
  entry: ReadingDnaDuelEntryData;
  isDark: boolean;
  onOpenDuel?: (opponentTicketNumber: string) => void;
}) {
  const isBest = kind === "best";
  const badgeLabel = isBest ? "Лучшее совпадение" : "Главный антагонист";
  const directionLabel =
    entry.direction === "outgoing"
      ? "вы бросили вызов"
      : entry.direction === "incoming"
      ? "вам бросили вызов"
      : null;

  const cardClass = isBest
    ? isDark
      ? "bg-emerald-950/30 border-emerald-500/35 text-[#efe3cc]"
      : "bg-emerald-50/80 border-emerald-500/35 text-[#2e2a24]"
    : isDark
      ? "bg-rose-950/30 border-rose-500/40 text-[#efe3cc]"
      : "bg-rose-50/80 border-rose-400/45 text-[#2e2a24]";

  const accentClass = isBest
    ? isDark
      ? "text-emerald-300"
      : "text-emerald-700"
    : isDark
      ? "text-rose-300"
      : "text-rose-700";

  return (
    <div className={`p-3.5 rounded-xl border space-y-2 ${cardClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold ${accentClass}`}
          >
            {isBest ? <Trophy size={13} /> : <Flame size={13} />}
            {badgeLabel}
          </span>
          {directionLabel && (
            <span className="text-[10px] font-mono opacity-60">
              · {directionLabel}
            </span>
          )}
        </div>
        <span className={`font-mono text-lg font-black ${accentClass}`}>
          {entry.compatibility}%
        </span>
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold truncate">{entry.opponentName}</span>
          {entry.opponentTicketNumber && (
            <Link
              to={`/reading-dna?ticket=${entry.opponentTicketNumber}`}
              className="text-[11px] font-mono underline opacity-75 hover:opacity-100 shrink-0"
            >
              #{entry.opponentTicketNumber}
            </Link>
          )}
        </div>
        {entry.opponentArchetypeName && (
          <div className="text-xs opacity-75 truncate">
            {entry.opponentArchetypeName}
          </div>
        )}
      </div>

      {entry.kryptoniteConflict && (
        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
          <AlertTriangle size={12} />
          <span>Криптонит-конфликт</span>
        </div>
      )}

      {entry.opponentTicketNumber && onOpenDuel && (
        <button
          type="button"
          onClick={() => onOpenDuel(entry.opponentTicketNumber!)}
          className={`w-full mt-2 py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isBest
              ? isDark
                ? "border-emerald-500/40 hover:bg-emerald-500/15 text-emerald-300"
                : "border-emerald-700/30 hover:bg-emerald-100 text-emerald-900"
              : isDark
                ? "border-rose-500/40 hover:bg-rose-500/15 text-rose-300"
                : "border-rose-700/30 hover:bg-rose-100 text-rose-900"
          }`}
        >
          <Swords size={12} />
          <span>Смотреть карточку дуэли</span>
        </button>
      )}
    </div>
  );
}

/**
 * Журнал входящих дуэлей на странице билета («Кто сравнил вкус со мной»):
 * показывает общее число сравнений, лучшее совпадение, главного антагониста и список последних дуэлей.
 */
export function DnaDuelsJournal({
  ticketNumber,
  isOtherTicket = false,
  theme,
  onCopyChallengeLink,
  onOpenDuel,
}: DnaDuelsJournalProps) {
  const isDark = theme === "dark";

  const { data, isLoading } = useQuery({
    queryKey: ["readingDna", "duels", ticketNumber],
    queryFn: () => getTicketDuels(ticketNumber, 10),
    enabled: Boolean(ticketNumber),
    staleTime: 60_000,
  });

  const heading = isOtherTicket
    ? "История сравнений с этим билетом"
    : "История читательских дуэлей";

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
            <Swords size={12} />
            <span>Журнал дуэлей</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold mt-0.5">{heading}</h3>
        </div>

        {data && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
              isDark
                ? "bg-[#1e130c]/70 border-[rgba(201,163,91,0.35)] text-[#f3d999]"
                : "bg-[#fbf8f2] border-[rgba(59,110,168,0.3)] text-[#3b6ea8]"
            }`}
            title="Всего читательских дуэлей"
          >
            <Swords size={12} />
            <span>
              {data.totalDuels}{" "}
              {data.totalDuels % 10 === 1 && data.totalDuels % 100 !== 11
                ? "дуэль"
                : [2, 3, 4].includes(data.totalDuels % 10) && ![12, 13, 14].includes(data.totalDuels % 100)
                  ? "дуэли"
                  : "дуэлей"}
            </span>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-current/10 animate-pulse" />
          <div className="h-24 rounded-xl bg-current/10 animate-pulse" />
        </div>
      ) : !data || data.totalDuels === 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 text-xs">
          <p className="opacity-75 leading-relaxed">
            {isOtherTicket
              ? "С этим билетом ещё никто не сравнивал читательский вкус. Бросьте вызов первым!"
              : "Пока нет ни одного сравнения вкуса. Отправьте ссылку-вызов в книжный чат или сравните свой билет с другими читателями."}
          </p>
          {onCopyChallengeLink && !isOtherTicket && (
            <button
              type="button"
              onClick={onCopyChallengeLink}
              className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                isDark
                  ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                  : "bg-[#b3412f] hover:bg-[#c94935]"
              }`}
            >
              <Copy size={13} />
              <span>Скопировать ссылку-вызов</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Карточки хайлайтов: Лучшее совпадение и Главный антагонист */}
          {(data.bestMatch || data.mainAntagonist) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.bestMatch && (
                <HighlightCard
                  kind="best"
                  entry={data.bestMatch}
                  isDark={isDark}
                  onOpenDuel={onOpenDuel}
                />
              )}
              {data.mainAntagonist && (
                <HighlightCard
                  kind="antagonist"
                  entry={data.mainAntagonist}
                  isDark={isDark}
                  onOpenDuel={onOpenDuel}
                />
              )}
            </div>
          )}

          {/* Список последних сравнений */}
          {(data.recentDuels?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase font-mono tracking-wider opacity-60">
                Последние сравнения
              </div>
              <ul className="divide-y divide-current/10 rounded-xl border border-current/15 overflow-hidden">
                {data.recentDuels.map((duel) => (
                  <li
                    key={duel.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                      isDark ? "bg-[#1e130c]/50" : "bg-[#fbf8f2]/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold truncate">
                        {duel.opponentName}
                      </span>
                      {duel.direction === "outgoing" ? (
                        <span
                          className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none ${
                            isDark
                              ? "border-amber-500/35 text-amber-300 bg-amber-500/10"
                              : "border-amber-700/30 text-amber-900 bg-amber-50"
                          }`}
                          title="Вы сравнили свой вкус с этим читателем"
                        >
                          вы вызвали
                        </span>
                      ) : duel.direction === "incoming" ? (
                        <span
                          className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none ${
                            isDark
                              ? "border-slate-500/35 text-slate-300 bg-slate-500/10"
                              : "border-slate-400/35 text-slate-700 bg-slate-100"
                          }`}
                          title="Этот читатель сравнил вкус с вами"
                        >
                          вызов вам
                        </span>
                      ) : null}
                      {duel.opponentTicketNumber && (
                        <Link
                          to={`/reading-dna?ticket=${duel.opponentTicketNumber}`}
                          className="font-mono text-[11px] opacity-65 hover:opacity-100 underline"
                        >
                          #{duel.opponentTicketNumber}
                        </Link>
                      )}
                      {duel.kryptoniteConflict && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-400">
                          <AlertTriangle size={10} />
                          криптонит
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] opacity-55 hidden sm:inline">
                        {formatShortDate(duel.createdAt)}
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                          duel.compatibility >= 75
                            ? isDark
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-emerald-100 text-emerald-800"
                            : duel.compatibility <= 35 || duel.kryptoniteConflict
                              ? isDark
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-rose-100 text-rose-800"
                              : isDark
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {duel.compatibility}%
                      </span>
                      {duel.opponentTicketNumber && onOpenDuel && (
                        <button
                          type="button"
                          onClick={() => onOpenDuel(duel.opponentTicketNumber!)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isDark
                              ? "border-amber-500/30 hover:bg-amber-500/20 text-amber-300"
                              : "border-amber-700/30 hover:bg-amber-100 text-amber-900"
                          }`}
                          title="Открыть карточку дуэли и радар"
                          aria-label={`Открыть карточку дуэли с ${duel.opponentName}`}
                        >
                          <Swords size={13} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
