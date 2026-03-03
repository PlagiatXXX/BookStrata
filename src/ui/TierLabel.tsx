import { memo, useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { TIER_COLORS } from "@/constants/colors";
import type { Tier } from "@/types";
import { getTextColorForBackground } from "@/utils/colorUtils";

interface TierLabelProps {
  tierId: string;
  title: string;
  color: string;
  labelSize?: Tier["labelSize"];
  onChangeColor: (tierId: string, newColor: string) => void;
  onRename: (tierId: string, newTitle: string) => void;
  droppableRef?: React.Ref<HTMLDivElement>;
}

const sizeClasses: Record<NonNullable<Tier["labelSize"]>, string> = {
  xs: "text-base md:text-base sm:text-sm max-sm:text-xs",
  sm: "text-lg md:text-lg sm:text-base max-sm:text-xs",
  md: "text-xl md:text-xl sm:text-lg max-sm:text-sm",
};

// Отдельный компонент для умного отображения текста
interface TierLabelTextProps {
  title: string;
  textColor: string;
  dynamicSizeClass: string;
}

const TierLabelText = memo(({ title, textColor, dynamicSizeClass }: TierLabelTextProps) => {
  const words = title.split(/\s+/);
  const isMultiWord = words.length >= 2;

  if (isMultiWord) {
    return (
      <span
        className={`font-black wrap-break-word ${textColor === "black" ? "text-black" : "text-white"} ${dynamicSizeClass}`}
      >
        {words[0]}
        <br />
        {words.slice(1).join(" ")}
      </span>
    );
  }

  return (
    <span
      className={`font-black hyphens-auto ${textColor === "black" ? "text-black" : "text-white"} ${dynamicSizeClass}`}
      style={{ hyphens: "auto" }}
    >
      {title}
    </span>
  );
});

TierLabelText.displayName = "TierLabelText";

export const TierLabel = memo(({
  tierId,
  title,
  color,
  labelSize = "sm",
  onChangeColor,
  onRename,
  droppableRef,
}: TierLabelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(title);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsPaletteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const dynamicSizeClass = sizeClasses[labelSize];
  const textColor = getTextColorForBackground(color);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setInputValue(title);
  };

  const handleBlur = () => {
    if (inputValue.trim() !== title && inputValue.trim() !== "") {
      onRename(tierId, inputValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setInputValue(title);
      setIsEditing(false);
    }
  };

  // Фокусируемся на input, когда он появляется
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div
      ref={droppableRef || wrapperRef}
      style={{ backgroundColor: color }}
      className="group/label relative flex 
                 w-24 md:w-32 sm:w-24 max-sm:w-16 
                 shrink-0 items-center justify-center 
                 border-r border-cyan-300/35 
                 p-2 md:p-2 sm:p-1.5 max-sm:p-1 
                 wrap-break-word"
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent text-center outline-none ${
            textColor === "black" ? "text-black" : "text-white"
          }`}
          style={{ fontSize: "inherit", fontWeight: "inherit" }}
        />
      ) : (
        <TierLabelText title={title} textColor={textColor} dynamicSizeClass={dynamicSizeClass} />
      )}

      <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover/label:opacity-100 max-md:opacity-100">
        <button
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          className="flex size-6 cursor-pointer items-center justify-center rounded-lg border border-cyan-300/45 bg-[rgba(7,12,27,0.82)] text-cyan-100 transition-colors hover:border-fuchsia-300/65 hover:text-fuchsia-100
                     md:size-6 sm:size-5 max-sm:size-4"
          title="Изменить цвет"
        >
          <Palette size={12} className="text-white md:w-3 md:h-3 sm:w-2.5 sm:h-2.5 max-sm:w-2 max-sm:h-2" />
        </button>
      </div>
      {isPaletteOpen && (
        <div className="absolute left-full top-0 z-20 ml-2 flex w-32 flex-wrap gap-1 rounded-[10px] border border-cyan-300/45 bg-[rgba(6,13,30,0.95)] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
          {TIER_COLORS.map((swatchColor) => (
            <div
              key={swatchColor}
              role="button"
              tabIndex={0}
              onClick={() => {
                onChangeColor(tierId, swatchColor);
                setIsPaletteOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChangeColor(tierId, swatchColor);
                  setIsPaletteOpen(false);
                }
              }}
              style={{ backgroundColor: swatchColor }}
              className={`size-5 cursor-pointer rounded ${
                // Добавляем стилизацию для выбранного цвета
                color.toLowerCase() === swatchColor.toLowerCase()
                  ? "ring-2 ring-cyan-200 ring-offset-2 ring-offset-[#060d1e]"
                  : ""
              }`}
              aria-label={`Выбрать цвет ${swatchColor}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TierLabel.displayName = "TierLabel";
