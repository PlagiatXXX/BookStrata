import { useState } from "react";
import type { TimeseriesPoint } from "@/lib/analyticsApi";

type MetricKey = "visitors" | "dau" | "registrations" | "tierlists" | "searches" | "aiRequests";

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: "visitors", label: "Посетители", color: "#38bdf8" },
  { key: "dau", label: "DAU", color: "#a78bfa" },
  { key: "registrations", label: "Регистрации", color: "#34d399" },
  { key: "tierlists", label: "Тир-листы", color: "#fbbf24" },
  { key: "searches", label: "Поиски", color: "#fb923c" },
  { key: "aiRequests", label: "ИИ-запросы", color: "#e879f9" },
];

interface TimeseriesChartProps {
  points: TimeseriesPoint[];
}

export function TimeseriesChart({ points }: TimeseriesChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("visitors");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const meta = METRIC_OPTIONS.find((m) => m.key === selectedMetric) ?? METRIC_OPTIONS[0]!;
  const values = points.map((p) => p[selectedMetric]);
  const maxVal = Math.max(...values, 1);
  const totalSum = values.reduce((acc, v) => acc + v, 0);

  const width = 760;
  const height = 210;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const coords = points.map((p, i) => {
    const x =
      points.length <= 1 ? padLeft + innerW / 2 : padLeft + (i / (points.length - 1)) * innerW;
    const y = padTop + innerH - (p[selectedMetric] / maxVal) * innerH;
    return { x, y, point: p, val: p[selectedMetric] };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1]!.x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${coords[0]!.x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : "";

  const hovered = hoverIndex !== null ? coords[hoverIndex] ?? null : null;

  return (
    <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Динамика по дням
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {meta.label}: всего <strong className="text-[#f6f1e8]">{totalSum}</strong> за период
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedMetric(opt.key)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                selectedMetric === opt.key
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-gray-800 bg-[#181818] text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500">Нет данных за выбранный период</div>
      ) : (
        <div className="relative">
          {hovered && (
            <div className="mb-2 inline-flex items-center gap-3 rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-1 text-xs">
              <span className="text-gray-400">{hovered.point.date}</span>
              <span className="font-bold" style={{ color: meta.color }}>
                {meta.label}: {hovered.val}
              </span>
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-52 overflow-visible select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = padTop + innerH * (1 - ratio);
              const label = Math.round(maxVal * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#262626"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#737373"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {areaPath && <path d={areaPath} fill={meta.color} fillOpacity="0.12" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={meta.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {coords.map((c, idx) => {
              const showLabel =
                idx === 0 ||
                idx === coords.length - 1 ||
                idx === Math.floor(coords.length / 2);
              return (
                <g key={c.point.date}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={hoverIndex === idx ? 5 : 2.5}
                    fill={meta.color}
                  />
                  <rect
                    x={c.x - Math.max(innerW / Math.max(coords.length, 1) / 2, 6)}
                    y={padTop}
                    width={Math.max(innerW / Math.max(coords.length, 1), 12)}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />
                  {showLabel && (
                    <text
                      x={c.x}
                      y={height - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#737373"
                    >
                      {c.point.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
