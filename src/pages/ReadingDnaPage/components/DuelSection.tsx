import { useState, useMemo } from "react";
import type { DnaAxesData } from "@/lib/readingDnaApi";

export interface DuelSectionProps {
  userAxes: DnaAxesData;
  challengerName?: string;
  theme?: "dark" | "craft" | "light";
  className?: string;
}

const AXIS_NAMES = [
  "Рефлексия",
  "Тяжесть",
  "Погружение",
  "Мрачность",
  "Эпика",
  "Глубина",
];

// Фиксированный профиль Алексея из эталонного прототипа
const ALEXEY_AXES = [80, 70, 75, 65, 85, 70];

export function DuelSection({
  userAxes,
  challengerName = "Алексей",
  theme = "dark",
  className = "",
}: DuelSectionProps) {
  const isDark = theme === "dark";
  const [showEmptyTwins, setShowEmptyTwins] = useState(false);

  // Расчет совместимости
  const userValues = useMemo(() => [
    userAxes.storyFocus || 50,
    userAxes.emotionalWeight || 50,
    userAxes.pace || 50,
    userAxes.darkness || 50,
    userAxes.scope || 50,
    userAxes.complexity || 50,
  ], [userAxes]);

  const compatibility = useMemo(() => {
    const diffSum = userValues.reduce((acc, val, i) => acc + Math.abs(val - (ALEXEY_AXES[i] || 50)), 0);
    return Math.max(30, Math.min(99, Math.round(100 - diffSum / 6)));
  }, [userValues]);

  // Расчет точек радара для пользователя и Алексея
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 64;

  const userRadarPoints = useMemo(() => {
    return userValues
      .map((val, idx) => {
        const angle = (Math.PI / 3) * idx - Math.PI / 2;
        const r = (Math.max(10, val) / 100) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [userValues, cx, cy, radius]);

  const alexeyRadarPoints = useMemo(() => {
    return ALEXEY_AXES
      .map((val, idx) => {
        const angle = (Math.PI / 3) * idx - Math.PI / 2;
        const r = (val / 100) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [cx, cy, radius]);

  const twins = [
    { initial: "М", name: "Мира", score: 91 },
    { initial: "Д", name: "Дима", score: 86 },
    { initial: "Л", name: "Лена", score: 82 },
  ];

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${className}`}>
      {/* ЛЕВАЯ КОЛОНКА: Совместимость и наложение радаров */}
      <div
        className={`lg:col-span-7 rounded-xl border p-5 sm:p-7 flex flex-col items-center text-center shadow-lg transition-colors ${
          isDark
            ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
            : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
        }`}
      >
        <div
          className={`text-3xl sm:text-4xl font-bold tracking-tight mb-2 ${
            isDark
              ? "font-serif text-[#c9a35b]"
              : "font-['Caveat',cursive] text-4xl sm:text-5xl text-[#3b6ea8]"
          }`}
        >
          Совместимость {compatibility}%
        </div>

        <p className="text-xs sm:text-sm opacity-80 max-w-sm mb-4 leading-relaxed">
          Вы оба обожаете «Дюну», но разошлись во взглядах на Достоевского.
        </p>

        {/* Радар вкусов: сплошная линия vs пунктир */}
        <div className="relative my-2">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible select-none">
            {/* Концентрическая паутинка */}
            {[0.33, 0.66, 1].map((scale, i) => {
              const gridPoints = [0, 1, 2, 3, 4, 5]
                .map((idx) => {
                  const angle = (Math.PI / 3) * idx - Math.PI / 2;
                  const r = radius * scale;
                  return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
                })
                .join(" ");

              return (
                <polygon
                  key={i}
                  points={gridPoints}
                  fill="none"
                  stroke={isDark ? "rgba(201,163,91,0.25)" : "rgba(59,110,168,0.25)"}
                  strokeWidth="1"
                  strokeDasharray={scale === 1 ? undefined : "2 2"}
                />
              );
            })}

            {/* Лучи */}
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
                  stroke={isDark ? "rgba(201,163,91,0.25)" : "rgba(59,110,168,0.25)"}
                  strokeWidth="1"
                />
              );
            })}

            {/* Заливка пользователя (сплошная линия) */}
            <polygon
              points={userRadarPoints}
              fill={isDark ? "rgba(201,163,91,0.25)" : "rgba(59,110,168,0.25)"}
              stroke={isDark ? "#c9a35b" : "#3b6ea8"}
              strokeWidth="2"
            />

            {/* Пунктирный контур соперника (Алексей) */}
            <polygon
              points={alexeyRadarPoints}
              fill="rgba(181, 101, 29, 0.15)"
              stroke="#b5651d"
              strokeWidth="2"
              strokeDasharray="4 3"
            />

            {/* Метки осей */}
            {AXIS_NAMES.map((name, idx) => {
              const angle = (Math.PI / 3) * idx - Math.PI / 2;
              const labelDist = radius + 15;
              const lx = cx + labelDist * Math.cos(angle);
              const ly = cy + labelDist * Math.sin(angle) + 3;
              return (
                <text
                  key={idx}
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  className={`text-[8px] font-mono ${
                    isDark ? "fill-[#a89678]" : "fill-[#6f6553]"
                  }`}
                >
                  {name}
                </text>
              );
            })}
          </svg>
        </div>

        <p className="text-[11px] opacity-70 mt-2 mb-4">
          Сплошная линия — вы, пунктир — {challengerName}
        </p>

        <button
          type="button"
          onClick={() => alert("Карточка дуэли сохранена")}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
            isDark
              ? "bg-[#8a2433] hover:bg-[#a32b3d]"
              : "bg-[#b3412f] hover:bg-[#c94935]"
          }`}
        >
          Скачать карточку дуэли
        </button>
      </div>

      {/* ПРАВАЯ КОЛОНКА: Книжные близнецы платформы */}
      <div
        className={`lg:col-span-5 rounded-xl border p-5 sm:p-7 flex flex-col justify-between shadow-lg transition-colors ${
          isDark
            ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
            : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
        }`}
      >
        <div className="space-y-4">
          <div>
            <h3
              className={`text-base sm:text-lg font-bold ${
                isDark ? "font-serif text-[#efe3cc]" : "font-['Caveat',cursive] text-xl text-[#2e2a24]"
              }`}
            >
              Книжные близнецы платформы
            </h3>
            <span className="text-xs opacity-60 block mt-0.5">Совпадение от 80%</span>
          </div>

          {!showEmptyTwins ? (
            <div className="flex items-center gap-4 py-2">
              {twins.map((t, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm mb-1.5 ${
                      isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                    }`}
                  >
                    {t.initial}
                  </div>
                  <span className="text-xs font-semibold">{t.name}</span>
                  <span className="text-[10px] opacity-70">{t.score}%</span>
                  <a
                    href="#profile"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Профиль читателя ${t.name}`);
                    }}
                    className={`text-[10px] font-semibold underline mt-0.5 ${
                      isDark ? "text-[#c9a35b]" : "text-[#3b6ea8]"
                    }`}
                  >
                    Профиль
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs opacity-70 py-4 leading-relaxed">
              Близнецов пока нет. Они появятся, когда тест пройдёт больше читателей.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-current/10">
          <button
            type="button"
            onClick={() => setShowEmptyTwins((prev) => !prev)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isDark
                ? "border-[rgba(201,163,91,0.3)] hover:bg-[#c9a35b]/10 text-[#efe3cc]"
                : "border-[rgba(59,110,168,0.3)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
            }`}
          >
            {showEmptyTwins ? "Показать близнецов" : "Показать пустое состояние"}
          </button>
        </div>
      </div>
    </div>
  );
}
