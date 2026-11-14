import { useMemo } from "react";
import { Shield, BookMarked, Compass } from "lucide-react";
import type { DnaAxesData } from "@/lib/readingDnaApi";

export interface LiveTicketPreviewProps {
  axes: DnaAxesData;
  currentStep: number;
  theme?: "dark" | "craft";
  customName?: string;
}

interface AxisPoint {
  key: keyof DnaAxesData;
  label: string;
  angle: number; // in radians
}

const AXIS_META: AxisPoint[] = [
  { key: "storyFocus", label: "Сюжет", angle: -Math.PI / 2 },
  { key: "emotionalWeight", label: "Эмоция", angle: -Math.PI / 6 },
  { key: "pace", label: "Темп", angle: Math.PI / 6 },
  { key: "darkness", label: "Мрак", angle: Math.PI / 2 },
  { key: "scope", label: "Масштаб", angle: (5 * Math.PI) / 6 },
  { key: "complexity", label: "Сложность", angle: -(5 * Math.PI) / 6 },
];

const CENTER = 150;
const RADIUS = 88;
const LEVELS = [0.25, 0.5, 0.75, 1];

export function LiveTicketPreview({
  axes,
  currentStep,
  theme = "dark",
  customName,
}: LiveTicketPreviewProps) {
  const isDark = theme === "dark";

  // Расчет точек для концентрических уровней сетки радара
  const gridPolygons = useMemo(() => {
    return LEVELS.map((level) => {
      const points = AXIS_META.map((axis) => {
        const r = RADIUS * level;
        const x = CENTER + r * Math.cos(axis.angle);
        const y = CENTER + r * Math.sin(axis.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      return { level, points };
    });
  }, []);

  // Расчет точек живого полигона ДНК по значениям осей
  const radarPoints = useMemo(() => {
    return AXIS_META.map((axis) => {
      const rawVal = axes[axis.key] ?? 0;
      const ratio = Math.max(0.08, rawVal / 100);
      const r = RADIUS * ratio;
      const x = CENTER + r * Math.cos(axis.angle);
      const y = CENTER + r * Math.sin(axis.angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [axes]);

  const areBooksUnmasked = currentStep >= 5;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border shadow-xl transition-all duration-500 overflow-hidden ${
        isDark
          ? "theme-dark bg-[#0b0f19] border-amber-500/20 text-slate-200 shadow-black/80"
          : "theme-craft bg-[#fcfaf6] border-stone-300 text-stone-800 shadow-stone-400/20"
      }`}
    >
      {/* Декоративная фоновая сетка архива */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${
            isDark ? "#ffffff" : "#000000"
          } 1px, transparent 0)`,
          backgroundSize: "18px 18px",
        }}
      />

      {/* Верхний колонтитул билета (уменьшенный и адаптированный) */}
      <div className="relative z-10 flex items-center justify-between border-b pb-3 border-current/10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border ${
              isDark
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-amber-100 border-amber-300 text-amber-800"
            }`}
          >
            <Compass size={15} />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] font-mono opacity-50">
              Архивный формуляр читателя
            </div>
            <div className="font-serif font-bold text-xs sm:text-sm tracking-wide flex items-center gap-2">
              <span>Билет тайного общества</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-amber-500/30 opacity-75">
                BS-2026-DNA
              </span>
            </div>
          </div>
        </div>

        {/* Индикатор текущего этапа калибровки */}
        <div
          className={`px-2.5 py-0.8 rounded-full text-[10px] font-mono tracking-wider border uppercase flex items-center gap-1.5 ${
            isDark
              ? "bg-slate-900 border-slate-700 text-amber-400"
              : "bg-white border-stone-200 text-stone-600 shadow-xs"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Калибровка: {currentStep} / 6</span>
        </div>
      </div>

      {/* Центральная часть: адаптивный SVG Spider Radar Chart */}
      <div className="relative z-10 flex flex-col items-center my-auto py-2">
        <div className="relative w-full max-w-[240px] sm:max-w-[270px] xl:max-w-[310px] aspect-square">
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full overflow-visible select-none"
            aria-label="Радар литературного ДНК"
          >
            {/* Концентрическая сетка уровней */}
            {gridPolygons.map(({ level, points }) => (
              <polygon
                key={level}
                points={points}
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
                strokeWidth={level === 1 ? "1.2" : "0.8"}
                strokeDasharray={level < 1 ? "3 3" : undefined}
              />
            ))}

            {/* Лучи от центра к вершинам */}
            {AXIS_META.map((axis) => {
              const x2 = CENTER + RADIUS * Math.cos(axis.angle);
              const y2 = CENTER + RADIUS * Math.sin(axis.angle);
              return (
                <line
                  key={axis.key}
                  x1={CENTER}
                  y1={CENTER}
                  x2={x2}
                  y2={y2}
                  stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Живой полигон ДНК */}
            <polygon
              data-testid="dna-radar-polygon"
              points={radarPoints}
              fill={
                isDark
                  ? "rgba(212, 175, 55, 0.22)"
                  : "rgba(180, 83, 9, 0.16)"
              }
              stroke={isDark ? "#d4af37" : "#b45309"}
              strokeWidth="2"
              className="transition-all duration-300 ease-out"
            />

            {/* Точки на вершинах полигона */}
            {AXIS_META.map((axis) => {
              const rawVal = axes[axis.key] ?? 0;
              const ratio = Math.max(0.08, rawVal / 100);
              const r = RADIUS * ratio;
              const cx = CENTER + r * Math.cos(axis.angle);
              const cy = CENTER + r * Math.sin(axis.angle);
              return (
                <circle
                  key={axis.key}
                  cx={cx}
                  cy={cy}
                  r={rawVal > 0 ? "3.5" : "1.8"}
                  fill={isDark ? "#d4af37" : "#b45309"}
                  stroke={isDark ? "#0b0f19" : "#ffffff"}
                  strokeWidth="1.2"
                  className="transition-all duration-300 ease-out"
                />
              );
            })}

            {/* Подписи осей снаружи круга */}
            {AXIS_META.map((axis) => {
              const labelRadius = RADIUS + 22;
              const lx = CENTER + labelRadius * Math.cos(axis.angle);
              const ly = CENTER + labelRadius * Math.sin(axis.angle);
              const val = axes[axis.key] ?? 0;
              return (
                <g key={axis.key} className="transition-opacity duration-300">
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isDark ? "#94a3b8" : "#57534e"}
                    fontSize="9.5"
                    fontFamily="serif"
                    className="font-medium tracking-wider"
                  >
                    {axis.label}
                  </text>
                  {val > 0 && (
                    <text
                      x={lx}
                      y={ly + 10}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isDark ? "#d4af37" : "#b45309"}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {val}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-1 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
            {customName || "Искатель смыслов"} • Геометрия вкуса
          </p>
        </div>
      </div>

      {/* Нижняя часть: компактное прогрессивное проявление */}
      <div className="relative z-10 mt-3 pt-3 border-t border-current/10">
        {areBooksUnmasked ? (
          <div data-testid="books-unmasked" className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-[11px] font-serif">
              <span className="flex items-center gap-1.5 opacity-80">
                <BookMarked size={12} className="text-amber-500" />
                Священные книги калибровочного резонанса
              </span>
              <span className="text-[9px] font-mono text-amber-500">Готовы к запечатыванию</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  isDark
                    ? "bg-slate-900/50 border-amber-500/20"
                    : "bg-white/80 border-stone-200"
                }`}
              >
                <div className="text-[9px] font-mono opacity-50">Книга I</div>
                <div className="text-[11px] font-serif font-medium truncate">Резонанс темпа</div>
              </div>
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  isDark
                    ? "bg-slate-900/50 border-amber-500/20"
                    : "bg-white/80 border-stone-200"
                }`}
              >
                <div className="text-[9px] font-mono opacity-50">Книга II</div>
                <div className="text-[11px] font-serif font-medium truncate">Свет и Тень</div>
              </div>
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  isDark
                    ? "bg-slate-900/50 border-amber-500/20"
                    : "bg-white/80 border-stone-200"
                }`}
              >
                <div className="text-[9px] font-mono opacity-50">Книга III</div>
                <div className="text-[11px] font-serif font-medium truncate">Философия</div>
              </div>
            </div>
          </div>
        ) : (
          <div
            data-testid="books-placeholder"
            className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-current/15 text-[11px] opacity-60 font-mono text-center"
          >
            <div className="flex items-center gap-2 mx-auto">
              <Shield size={12} />
              <span>Архивация священных фолиантов откроется на шаге 5...</span>
            </div>
          </div>
        )}
      </div>

      {/* Сургучная печать тайного общества (тисненая метка в углу) */}
      <div className="absolute bottom-3 right-3 pointer-events-none opacity-20 hover:opacity-40 transition-opacity">
        <div
          className={`w-11 h-11 rounded-full border border-dashed flex items-center justify-center font-serif text-[8px] uppercase tracking-tighter text-center leading-none p-1 ${
            isDark ? "border-amber-400/50 text-amber-300" : "border-stone-400 text-stone-700"
          }`}
        >
          SIGILLUM ARCHIVI
        </div>
      </div>
    </div>
  );
}
