import { useCallback } from "react";
import { motion } from "motion/react";

export interface CreativeSliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  theme?: "dark" | "craft";
  description?: string;
  icon?: React.ReactNode;
}

export function CreativeSlider({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
  theme = "dark",
  description,
  icon,
}: CreativeSliderProps) {
  const isDark = theme === "dark";

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  const handleSetLeft = useCallback(() => onChange(0), [onChange]);
  const handleSetRight = useCallback(() => onChange(100), [onChange]);

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 border ${
        isDark
          ? "bg-[#131926]/80 border-slate-800/80 hover:border-amber-500/30 shadow-lg shadow-black/20"
          : "bg-white/90 border-stone-300/80 hover:border-amber-600/40 shadow-sm"
      }`}
    >
      {/* Шапка слайдера */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={`p-1.5 rounded-lg text-sm ${
                isDark
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {icon}
            </span>
          )}
          <span
            className={`font-serif font-bold text-base sm:text-lg tracking-wide ${
              isDark ? "text-slate-100" : "text-stone-900"
            }`}
          >
            {label}
          </span>
        </div>

        {/* Бейдж процента */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
            isDark
              ? "bg-amber-500/10 border-amber-400/30 text-amber-300"
              : "bg-amber-100 border-amber-300 text-amber-900"
          }`}
        >
          {value}%
        </span>
      </div>

      {description && (
        <p
          className={`text-xs mb-4 ${
            isDark ? "text-slate-400" : "text-stone-600"
          }`}
        >
          {description}
        </p>
      )}

      {/* Интерактивные карточки полюсов */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSetLeft}
          className={`text-left p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            value < 35
              ? isDark
                ? "bg-amber-500/15 border-amber-400/40 text-amber-200 shadow-xs"
                : "bg-amber-100/80 border-amber-400 text-amber-950 font-semibold"
              : isDark
                ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300"
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider opacity-60 mb-0.5">
            0% · Полюс А
          </span>
          {leftLabel}
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSetRight}
          className={`text-right p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            value > 65
              ? isDark
                ? "bg-amber-500/15 border-amber-400/40 text-amber-200 shadow-xs"
                : "bg-amber-100/80 border-amber-400 text-amber-950 font-semibold"
              : isDark
                ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300"
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider opacity-60 mb-0.5">
            Полюс Б · 100%
          </span>
          {rightLabel}
        </motion.button>
      </div>

      {/* Тактильный Range Slider с прогресс-баром */}
      <div className="relative flex items-center py-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleInputChange}
          role="slider"
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`w-full h-3 rounded-full appearance-none cursor-pointer focus:outline-none transition-all ${
            isDark ? "bg-slate-800" : "bg-stone-200"
          } accent-amber-500`}
        />
      </div>

      {/* Засечки делений */}
      <div className="flex justify-between px-1 text-[10px] font-mono text-slate-500 opacity-60 select-none">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}
