/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import type { ActivityTimelinePoint } from "@/lib/userApi";

const MONTH_LABELS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

export interface SeriesConfig {
  key: "books" | "likes";
  label: string;
  color: string;
}

const SERIES: SeriesConfig[] = [
  { key: "books", label: "Книг за месяц", color: "#38bdf8" },
  { key: "likes", label: "Лайков за месяц", color: "#4ade80" },
];

const W = 720;
const H = 140;
const PAD_X = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

interface Pt {
  x: number;
  y: number;
}

/** Catmull-Rom → кубические Безье: сглаженная кривая через все точки. */
export function buildSmoothPath(points: Pt[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function monthLabel(month: string): string {
  const idx = Number(month.slice(5, 7)) - 1;
  return MONTH_LABELS[idx] ?? month;
}

export function ActivityChart({
  data,
  isLoading,
}: {
  data: ActivityTimelinePoint[];
  isLoading: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="activity-chart activity-chart--loading h-32 animate-pulse sm:h-36" />
    );
  }

  const isEmpty = data.every((p) => p.books === 0 && p.likes === 0);
  if (isEmpty) {
    return (
      <div className="activity-chart activity-chart--empty flex h-32 items-center justify-center text-sm sm:h-36">
        Здесь появится график вашей активности — добавляйте книги и получайте
        лайки
      </div>
    );
  }

  const maxY = Math.max(4, ...data.map((p) => Math.max(p.books, p.likes)));
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const toPoints = (key: "books" | "likes"): Pt[] =>
    data.map((p, i) => ({
      x: PAD_X + i * stepX,
      y: PAD_TOP + innerH - (p[key] / maxY) * innerH,
    }));

  const hoverPoint = hover !== null ? data[hover] : null;

  return (
    <div className="activity-chart relative w-full rounded-2xl border p-3 sm:p-4">
      {/* Легенда */}
      <div className="activity-chart__legend mb-1 flex flex-wrap items-center justify-end gap-4 pr-1">
        {SERIES.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 text-xs text-gray-300"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="График активности по месяцам"
        data-testid="chart-svg"
      >
        {/* Сетка: вертикальные пунктирные линии по месяцам */}
        {data.map((p, i) => (
          <line
            key={p.month}
            x1={PAD_X + i * stepX}
            x2={PAD_X + i * stepX}
            y1={PAD_TOP - 4}
            y2={PAD_TOP + innerH + 2}
            stroke="#47556955"
            strokeDasharray="2 6"
          />
        ))}

        {SERIES.map((s) => {
          const pts = toPoints(s.key);
          return (
            <g key={s.key}>
              <path
                d={buildSmoothPath(pts)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${s.color}99)` }}
              />
              {pts.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hover === i ? 6 : 4.5}
                  fill={s.color}
                  stroke="#0b1120"
                  strokeWidth={1.5}
                  style={{ filter: `drop-shadow(0 0 5px ${s.color})` }}
                />
              ))}
            </g>
          );
        })}

        {/* Подписи месяцев */}
        {data.map((p, i) => (
          <text
            key={p.month}
            x={PAD_X + i * stepX}
            y={H - 8}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize={10}
          >
            {monthLabel(p.month)}
          </text>
        ))}

        {/* Невидимые колонки для ховера */}
        {data.map((_, i) => {
          const colX = PAD_X + i * stepX - stepX / 2;
          return (
            <rect
              key={i}
              data-testid={`chart-col-${i}`}
              x={Math.max(PAD_X - stepX / 2, i === 0 ? 0 : colX)}
              y={0}
              width={stepX || W}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hoverPoint && hover !== null && (
        <div
          data-testid="chart-tooltip"
          className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-900/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: `${((PAD_X + hover * stepX) / W) * 100}%` }}
        >
          <p className="mb-1 font-semibold text-white">
            {monthLabel(hoverPoint.month)}
          </p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center gap-1.5 text-gray-300">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}:{" "}
              <span className="font-bold text-white">{hoverPoint[s.key]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
