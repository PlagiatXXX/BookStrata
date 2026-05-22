import { memo, useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { TIER_COLORS } from "@/constants/colors";
import type { Tier } from "@/types";
import { getTextColorForBackground } from "@/utils/colorUtils";

const COLOR_NAMES: Record<string, string> = {
  '#FFC0CB': 'Розовый',
  '#DB7093': 'Бледно-фиолетово-красный',
  '#FF69B4': 'Ярко-розовый',
  '#FF00FF': 'Маджента',
  '#FF1493': 'Глубокий розовый',
  '#C71585': 'Средний фиолетово-красный',
  '#800080': 'Пурпурный',
  '#ff0000': 'Красный',
  '#800000': 'Темно-бордовый',
  '#00FFFF': 'Голубой',
  '#008080': 'Бирюзовый',
  '#0000FF': 'Синий',
  '#008000': 'Зеленый',
  '#00FF00': 'Лаймовый',
  '#808000': 'Оливковый',
  '#FFD700': 'Золотистый',
  '#8B4513': 'Коричневый',
  '#C0C0C0': 'Серебристый',
  '#FFFFFF': 'Белый',
  '#000000': 'Черный',
};

interface TierLabelProps {
  tierId: string;
  title: string;
  color: string;
  labelSize?: Tier["labelSize"];
  onChangeColor?: (tierId: string, newColor: string) => void;
  onRename?: (tierId: string, newTitle: string) => void;
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

const TierLabelText = memo(
  ({ title, textColor, dynamicSizeClass }: TierLabelTextProps) => {
    const words = title.split(/\s+/);
    const isMultiWord = words.length >= 2;

    if (isMultiWord) {
      return (
        <span
          className={`nb-label-text font-black wrap-break-word ${textColor === "black" ? "text-black" : "text-white"} ${dynamicSizeClass}`}
        >
          {words[0]}
          <br />
          {words.slice(1).join(" ")}
        </span>
      );
    }

    return (
      <span
        className={`nb-label-text font-black hyphens-auto ${textColor === "black" ? "text-black" : "text-white"} ${dynamicSizeClass}`}
        style={{ hyphens: "auto" }}
      >
        {title}
      </span>
    );
  },
);

TierLabelText.displayName = "TierLabelText";

export const TierLabel = memo(
  ({
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

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setIsPaletteOpen(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [wrapperRef]);

    const dynamicSizeClass = sizeClasses[labelSize];
    const textColor = getTextColorForBackground(color);

    const handleDoubleClick = () => {
      if (!onRename) return;
      setIsEditing(true);
      setInputValue(title);
    };

    const handleBlur = () => {
      if (inputValue.trim() !== title && inputValue.trim() !== "") {
        onRename?.(tierId, inputValue.trim());
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

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleKeyDownContainer = (e: React.KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDoubleClick();
      }
    };

    return (
      <div
        ref={droppableRef || wrapperRef}
        style={{ backgroundColor: color }}
        className="nb-rank-box group/label relative flex shrink-0 items-center justify-center focus-within:opacity-100 tier-label cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-inset"
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDownContainer}
        tabIndex={isEditing ? -1 : 0}
        role="button"
        aria-label={`Уровень ${title}. Нажмите Enter для переименования`}
        title="Двойной клик или Enter для переименования"
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
          <TierLabelText
            title={title}
            textColor={textColor}
            dynamicSizeClass={dynamicSizeClass}
          />
        )}

        {onChangeColor && (
          <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover/label:opacity-100 focus-within:opacity-100 max-md:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaletteOpen(!isPaletteOpen);
              }}
              aria-label="Изменить цвет уровня"
              aria-expanded={isPaletteOpen}
              aria-haspopup="true"
              className="nb-heavy-border flex size-6 cursor-pointer items-center justify-center bg-black text-white hover:bg-white hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 palette-toggle"
              title="Изменить цвет"
            >
              <Palette size={12} aria-hidden="true" />
            </button>
          </div>
        )}
        {onChangeColor && isPaletteOpen && (
          <div
            role="group"
            aria-label="Цветовая палитра"
            className="nb-heavy-border absolute left-full top-0 z-50 ml-2 flex w-32 flex-wrap gap-1 bg-white p-2 shadow-[4px_4px_0_0_#000000]"
          >
            {TIER_COLORS.map((swatchColor) => {
              const colorName = COLOR_NAMES[swatchColor as keyof typeof COLOR_NAMES] ||
                               COLOR_NAMES[swatchColor.toUpperCase() as keyof typeof COLOR_NAMES] ||
                               COLOR_NAMES[swatchColor.toLowerCase() as keyof typeof COLOR_NAMES] ||
                               swatchColor;
              return (
                <button
                  key={swatchColor}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeColor(tierId, swatchColor);
                    setIsPaletteOpen(false);
                  }}
                  style={{ backgroundColor: swatchColor }}
                  className={`size-5 cursor-pointer border border-black hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 outline-none ${
                    color.toLowerCase() === swatchColor.toLowerCase()
                      ? "ring-2 ring-cyan-200 ring-offset-2"
                      : ""
                  }`}
                  aria-label={`Выбрать цвет: ${colorName}`}
                  title={colorName}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

TierLabel.displayName = "TierLabel";
