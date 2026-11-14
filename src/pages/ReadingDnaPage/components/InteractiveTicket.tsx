import { useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  Share2,
  Swords,
  RotateCcw,
  BookMarked,
} from "lucide-react";
import type { ReadingDnaResponseData, DnaAxesData, DnaArchetypeCatalogItem } from "@/lib/readingDnaApi";
import { shareReadingTicket } from "@/lib/readingDnaApi";
import { useDnaArchetypes } from "../hooks/useDnaArchetypes";
import { findArchetypeByIdOrName } from "../domain/dnaArchetypeMatch";
import { OnboardingHub } from "./OnboardingHub";
import { ReadingTicketQr } from "./ReadingTicketQr";
import { TicketBookCover } from "./TicketBookCover";

export interface InteractiveTicketProps {
  ticket: ReadingDnaResponseData;
  onRetake: () => void;
  onDuel?: (ticketNumber: string) => void;
  showHub?: boolean;
}

// Касты и цвета печати
interface CasteMetadata {
  name: string;
  sealColor: string;
  sealBorder: string;
  badge: string;
  icon: string;
}

const CASTE_ICONS: Record<string, string> = {
  mind: "🏛️",
  abyss: "🗝️",
  action: "⚔️",
  light: "🕯️",
};

const CASTE_STYLES: Record<
  string,
  { name: string; sealColor: string; sealBorder: string; badge: string }
> = {
  mind: {
    name: "Орден Смыслов",
    sealColor: "from-slate-300 via-slate-400 to-slate-600",
    sealBorder: "border-slate-300/60",
    badge: "text-slate-200 bg-slate-800/80 border-slate-600",
  },
  abyss: {
    name: "Орден Бездны",
    sealColor: "from-purple-900 via-indigo-950 to-slate-950",
    sealBorder: "border-purple-400/60",
    badge: "text-purple-300 bg-purple-950/80 border-purple-600",
  },
  action: {
    name: "Орден Действия",
    sealColor: "from-amber-700 via-amber-800 to-amber-950",
    sealBorder: "border-amber-500/60",
    badge: "text-amber-300 bg-amber-950/80 border-amber-600",
  },
  light: {
    name: "Орден Света",
    sealColor: "from-amber-400 via-yellow-500 to-amber-600",
    sealBorder: "border-amber-300/80",
    badge: "text-amber-200 bg-amber-900/60 border-amber-500",
  },
};

function getCasteMetadata(
  archetypeIdOrName: string,
  archetypes: DnaArchetypeCatalogItem[]
): CasteMetadata {
  const found = findArchetypeByIdOrName(archetypes, archetypeIdOrName);
  const casteId = found?.caste.id || "light";
  const style = CASTE_STYLES[casteId] || CASTE_STYLES.light!;

  return {
    name: found?.caste.name || style.name,
    sealColor: style.sealColor,
    sealBorder: style.sealBorder,
    badge: style.badge,
    icon: CASTE_ICONS[casteId] || "🕯️",
  };
}

/**
 * 6-осевой радар вкуса (SVG Polygon Radar)
 */
function RadarChart({ axes, isDark }: { axes: DnaAxesData; isDark: boolean }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 68;

  const axisValues = [
    axes.storyFocus,
    axes.emotionalWeight,
    axes.pace,
    axes.darkness,
    axes.scope,
    axes.complexity,
  ];

  const axisNames = ["Сюжет", "Драма", "Темп", "Мрак", "Эпос", "Слог"];

  const points = axisValues.map((val, idx) => {
    const angle = (Math.PI / 3) * idx - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polygonPoints = points.join(" ");

  return (
    <div className="relative flex flex-col items-center select-none">
      <svg width={size} height={size} className="overflow-visible">
        {/* Концентрические сетки 33%, 66%, 100% */}
        {[0.33, 0.66, 1].map((scale, i) => {
          const gridPoints = [0, 1, 2, 3, 4, 5]
            .map((idx) => {
              const angle = (Math.PI / 3) * idx - Math.PI / 2;
              const r = radius * scale;
              return `${(cx + r * Math.cos(angle)).toFixed(1)},${(
                cy +
                r * Math.sin(angle)
              ).toFixed(1)}`;
            })
            .join(" ");

          return (
            <polygon
              key={i}
              points={gridPoints}
              fill="none"
              stroke={isDark ? "#334155" : "#cbd5e1"}
              strokeWidth="1"
              strokeDasharray={scale === 1 ? undefined : "3 3"}
            />
          );
        })}

        {/* Лучи из центра к вершинам */}
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const angle = (Math.PI / 3) * idx - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={isDark ? "#334155" : "#cbd5e1"}
              strokeWidth="1"
            />
          );
        })}

        {/* Заливка профиля читателя */}
        <polygon
          points={polygonPoints}
          fill={isDark ? "rgba(245, 158, 11, 0.28)" : "rgba(180, 83, 9, 0.22)"}
          stroke={isDark ? "#fbbf24" : "#b45309"}
          strokeWidth="2"
        />

        {/* Метки осей */}
        {axisNames.map((name, idx) => {
          const angle = (Math.PI / 3) * idx - Math.PI / 2;
          const labelDist = radius + 16;
          const lx = cx + labelDist * Math.cos(angle);
          const ly = cy + labelDist * Math.sin(angle) + 3;
          return (
            <text
              key={idx}
              x={lx}
              y={ly}
              textAnchor="middle"
              className={`text-[9px] font-mono font-bold tracking-tight ${
                isDark ? "fill-slate-400" : "fill-stone-600"
              }`}
            >
              {name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function InteractiveTicket({
  ticket,
  onRetake,
  onDuel,
  showHub = true,
}: InteractiveTicketProps) {
  const isDark = ticket.theme === "dark";
  const { archetypes } = useDnaArchetypes();
  const caste = getCasteMetadata(ticket.archetype || ticket.archetypeName, archetypes);
  const [copied, setCopied] = useState(false);

  const duelUrl = `https://bookstrata.ru/reading-dna/duel?ticket=${ticket.ticketNumber}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(duelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      shareReadingTicket(ticket.ticketNumber).catch(() => {});
    } catch {
      // Fallback
    }
  }, [duelUrl, ticket.ticketNumber]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Читательский билет: ${ticket.archetypeName}`,
          text: `Мой читательский архетип — ${ticket.archetypeName} (${caste.name}). Проверь нашу книжную совместимость на дуэли!`,
          url: duelUrl,
        });
        shareReadingTicket(ticket.ticketNumber).catch(() => {});
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  }, [ticket.archetypeName, ticket.ticketNumber, caste.name, duelUrl, handleCopyLink]);

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* КАРТОЧКА БИЛЕТА */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`relative overflow-hidden rounded-3xl border-2 transition-all duration-300 shadow-2xl p-6 sm:p-10 ${
          isDark
            ? "bg-[#0c101d] border-amber-500/40 text-slate-100 shadow-amber-950/20"
            : "bg-[#fbf7ed] border-stone-400 text-stone-900 shadow-stone-900/10"
        }`}
      >
        {/* Винтажная двойная декоративная рамка */}
        <div
          className={`absolute inset-2 border pointer-events-none rounded-2xl ${
            isDark ? "border-amber-500/20" : "border-stone-400/40"
          }`}
        />

        {/* ШАПКА БИЛЕТА: Номер и общество */}
        <div className="relative z-10 flex items-start justify-between pb-6 border-b border-dashed border-amber-500/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">{caste.icon}</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold opacity-75">
                ТАЙНОЕ ОБЩЕСТВО BOOKSTRATA
              </span>
            </div>
            <h3 className="font-serif font-black text-xl sm:text-2xl tracking-tight">
              ЧИТАТЕЛЬСКИЙ БИЛЕТ
            </h3>
            <div className="text-xs font-serif italic opacity-75">
              Владелец:{" "}
              <span className="font-bold font-sans not-italic text-amber-400">
                {ticket.customName || "Анонимный книжный странник"}
              </span>
            </div>
          </div>

          {/* Номер билета */}
          <div className="text-right">
            <span className="block text-[9px] font-mono uppercase tracking-widest opacity-60">
              НОМЕР
            </span>
            <span
              className={`inline-block font-mono font-black text-sm sm:text-base px-2.5 py-1 rounded-lg border ${
                isDark
                  ? "bg-amber-500/10 border-amber-400/40 text-amber-300"
                  : "bg-amber-100 border-amber-300 text-amber-950"
              }`}
            >
              #{ticket.ticketNumber}
            </span>
          </div>
        </div>

        {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: Каста, Архетип и Сургучная печать */}
        <div className="relative z-10 py-5 flex flex-col md:flex-row items-center gap-5 justify-between">
          <div className="space-y-3 flex-1 text-center md:text-left">
            {/* Бейдж касты */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${caste.badge}`}
            >
              <span>{caste.icon}</span>
              <span>{caste.name}</span>
            </div>

            {/* Название архетипа */}
            <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight leading-tight">
              {ticket.archetypeName}
            </h2>

            {/* Цитата-манифест */}
            {ticket.motto && (
              <p className="text-xs sm:text-sm font-serif italic text-amber-400/90 leading-relaxed max-w-md">
                {ticket.motto}
              </p>
            )}

            {/* Описание психологического профиля */}
            {ticket.archetypeDesc && (
              <p className="text-xs opacity-75 leading-relaxed max-w-md">
                {ticket.archetypeDesc}
              </p>
            )}
          </div>

          {/* 6-осевой радар вкуса */}
          <div className="shrink-0">
            <RadarChart axes={ticket.axes} isDark={isDark} />
          </div>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ: Святыни, Криптонит и Сургучная печать */}
        <div className="relative z-10 pt-4 border-t border-dashed border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Святыни и Криптонит */}
          <div className="space-y-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              <BookMarked size={14} />
              <span>Книги читательского кода:</span>
            </div>

            <div className="flex flex-wrap items-start gap-3 sm:gap-4">
              {ticket.favoriteBooks.map((b, idx) => (
                <TicketBookCover
                  key={idx}
                  book={b}
                  isDark={isDark}
                />
              ))}

              {/* Криптонит (если есть) */}
              {ticket.kryptoniteBook && (
                <div className="border-l border-dashed border-amber-500/30 pl-3 sm:pl-4">
                  <TicketBookCover
                    book={ticket.kryptoniteBook}
                    isDark={isDark}
                    isKryptonite={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Сургучная печать касты и персональный QR-код */}
          <div className="flex items-center justify-center gap-4 text-center shrink-0">
            {/* Персональный QR-код */}
            <div className="flex flex-col items-center">
              <div
                className={`p-1.5 rounded-xl border shadow-xs ${
                  isDark ? "bg-white/95 border-amber-500/40" : "bg-white border-stone-300"
                }`}
                title="Сканируй для дуэли"
              >
                <ReadingTicketQr
                  value={duelUrl}
                  size={52}
                  fgColor="#0f172a"
                  bgColor="transparent"
                />
              </div>
              <span className="block text-[8px] font-mono uppercase tracking-widest opacity-60 mt-1.5">
                QR ДУЭЛИ
              </span>
            </div>

            {/* Сургучная печать с надписью Иммунитет */}
            <div className="flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-full bg-linear-to-br ${caste.sealColor} border-2 ${caste.sealBorder} shadow-lg flex flex-col items-center justify-center p-1 text-center select-none rotate-3 hover:rotate-0 transition-transform`}
              >
                <span className="text-[7.5px] font-black uppercase tracking-tighter text-amber-100 leading-tight">
                  ИММУНИТЕТ
                </span>
                {ticket.kryptoniteBook ? (
                  <span className="text-[6.5px] font-serif text-amber-200/90 leading-tight max-w-[52px] truncate">
                    к «{ticket.kryptoniteBook.title}»
                  </span>
                ) : (
                  <span className="text-xs">{caste.icon}</span>
                )}
              </div>
              <span className="block text-[8px] font-mono uppercase tracking-[0.2em] font-extrabold opacity-60 mt-1.5">
                ПЕЧАТЬ
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* КНОПКИ ДЕЙСТВИЙ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
        >
          <Share2 size={16} />
          {copied ? "Ссылка скопирована!" : "Поделиться"}
        </button>

        <button
          type="button"
          onClick={() => onDuel?.(ticket.ticketNumber)}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
            isDark
              ? "bg-slate-900 border-amber-400/50 text-amber-300 hover:bg-slate-800"
              : "bg-white border-stone-400 text-stone-900 hover:bg-stone-50"
          }`}
        >
          <Swords size={16} />
          Бросить вызов
        </button>

        <button
          type="button"
          onClick={onRetake}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border opacity-75 hover:opacity-100 cursor-pointer ${
            isDark
              ? "border-slate-800 text-slate-400 hover:text-slate-200"
              : "border-stone-300 text-stone-600 hover:text-stone-900"
          }`}
        >
          <RotateCcw size={14} />
          Перепройти
        </button>
      </div>

      {/* ОНБОРДИНГ-ХАБ: Близнецы и витрина экосистемы */}
      {showHub && (
        <OnboardingHub
          ticketNumber={ticket.ticketNumber}
          archetypeName={ticket.archetypeName}
          casteName={caste.name}
          theme={ticket.theme === "craft" ? "craft" : "dark"}
        />
      )}
    </div>
  );
}
