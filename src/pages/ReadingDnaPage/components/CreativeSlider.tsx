import { useCallback } from "react";
import { JellySlider } from "./JellySlider";

export interface CreativeSliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  theme?: "dark" | "craft";
  description?: string;
  icon?: React.ReactNode;
  rubricLabel?: string;
  isTouched?: boolean;
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
  rubricLabel,
  isTouched = true,
}: CreativeSliderProps) {
  const isDark = theme === "dark";

  const handleSetLeft = useCallback(() => onChange(0), [onChange]);
  const handleSetRight = useCallback(() => onChange(100), [onChange]);

  return (
    <div className="w-full flex flex-col gap-2 py-1">
      {/* Шапка: название шкалы и значение */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span
              className={`p-0.5 rounded text-xs ${
                isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-900"
              }`}
            >
              {icon}
            </span>
          )}
          <span
            className={`font-serif font-bold text-xs sm:text-sm tracking-wide ${
              isDark ? "text-slate-100" : "text-stone-900"
            }`}
          >
            {label}
          </span>
        </div>

        {/* Минималистичный процент */}
        <span
          className={`font-mono text-[11px] font-semibold px-1.5 py-0.2 rounded border transition-colors ${
            isTouched
              ? isDark
                ? "bg-slate-900/60 border-slate-800 text-amber-400"
                : "bg-stone-100 border-stone-200 text-amber-900"
              : isDark
                ? "bg-slate-900/30 border-slate-800/50 text-slate-500"
                : "bg-stone-50 border-stone-200 text-stone-400"
          }`}
        >
          {value}%
        </span>
      </div>

      {description && (
        <p
          className={`text-[11px] sm:text-xs -mt-0.5 leading-relaxed ${
            isDark ? "text-slate-400" : "text-stone-600"
          }`}
        >
          {description}
        </p>
      )}

      {/* Метки полюсов оси */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs pt-0.5 select-none">
        <button
          type="button"
          onClick={handleSetLeft}
          className={`transition-colors duration-200 cursor-pointer text-left max-w-[48%] truncate ${
            isTouched && value <= 35
              ? isDark
                ? "text-amber-300 font-semibold"
                : "text-amber-800 font-semibold"
              : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-stone-500 hover:text-stone-800"
          }`}
          title="Сдвинуть к левому полюсу"
        >
          {leftLabel}
        </button>

        <button
          type="button"
          onClick={handleSetRight}
          className={`transition-colors duration-200 cursor-pointer text-right max-w-[48%] truncate ${
            isTouched && value >= 65
              ? isDark
                ? "text-amber-300 font-semibold"
                : "text-amber-800 font-semibold"
              : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-stone-500 hover:text-stone-800"
          }`}
          title="Сдвинуть к правому полюсу"
        >
          {rightLabel}
        </button>
      </div>

      {/* Jelly Slider с физикой пружин и всплывающей каплей */}
      <div className="py-0.5">
        <JellySlider
          value={value}
          onChange={onChange}
          theme={theme}
          ariaLabel={`${leftLabel} ↔ ${rightLabel}`}
        />
      </div>

      {/* Пояснительная надпись после протягивания ползунка */}
      {rubricLabel && (
        <div className="min-h-[2rem] flex items-center justify-center text-center px-1">
          <p
            className={`text-[11px] sm:text-xs leading-snug transition-all duration-200 ${
              isTouched
                ? isDark
                  ? "text-amber-300/90 font-medium"
                  : "text-amber-900 font-medium"
                : isDark
                  ? "text-slate-500 italic"
                  : "text-stone-400 italic"
            }`}
          >
            {rubricLabel}
          </p>
        </div>
      )}
    </div>
  );
}
