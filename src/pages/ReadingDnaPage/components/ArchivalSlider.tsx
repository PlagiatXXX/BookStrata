export interface ArchivalSliderProps {
  value: number;
  onChange: (value: number) => void;
  marks?: string[];
  theme?: "dark" | "craft" | "light";
  className?: string;
}

const DEFAULT_POINTS = [20, 50, 85];

export function ArchivalSlider({
  value,
  onChange,
  marks = ["Лёгкий бриз", "Баланс", "Глубоководное погружение"],
  theme = "dark",
  className = "",
}: ArchivalSliderProps) {
  const isDark = theme === "dark";

  return (
    <div className={`relative h-11 my-6 mx-2 select-none ${className}`}>
      {/* Горизонтальный трек шкалы */}
      <div
        className={`absolute left-0 right-0 top-5 h-1 rounded-full ${
          isDark ? "bg-[rgba(201,163,91,0.25)]" : "bg-[rgba(59,110,168,0.25)]"
        }`}
      >
        {/* Залитая полоса до ползунка */}
        <div
          className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-75 ${
            isDark ? "bg-[#c9a35b]" : "bg-[#3b6ea8]"
          }`}
          style={{ width: `${value}%` }}
        />

        {/* Подсечки с подписями на 20, 50, 85% */}
        {DEFAULT_POINTS.map((point, idx) => {
          const isNear = Math.abs(point - value) <= 14;
          return (
            <div
              key={point}
              className={`absolute -top-1.5 w-0.5 h-3.5 transition-colors ${
                isNear
                  ? isDark
                    ? "bg-[#c9a35b]"
                    : "bg-[#3b6ea8]"
                  : isDark
                    ? "bg-[#a89678]"
                    : "bg-[#6f6553]"
              }`}
              style={{ left: `${point}%` }}
            >
              <span
                className={`absolute top-5 left-1/2 -translate-x-1/2 w-28 text-center text-[11px] sm:text-xs leading-tight transition-all pointer-events-none ${
                  isNear
                    ? isDark
                      ? "text-[#efe3cc] font-bold"
                      : "text-[#2e2a24] font-bold"
                    : isDark
                      ? "text-[#a89678]"
                      : "text-[#6f6553]"
                }`}
              >
                {point} — {marks[idx] || ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Медно-сургучный бегунок */}
      <div
        className="absolute top-2 w-7 h-7 -ml-3.5 rounded-full pointer-events-none shadow-md transition-transform active:scale-125"
        style={{
          left: `${value}%`,
          background: isDark
            ? "radial-gradient(circle at 35% 30%, #b5651d, #8a2433)"
            : "radial-gradient(circle at 35% 30%, #c9892f, #b3412f)",
          boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
        }}
      />

      {/* Прозрачный input для клавиатурного и touch/mouse управления */}
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing"
        aria-label="Шкала восприятия"
      />
    </div>
  );
}
