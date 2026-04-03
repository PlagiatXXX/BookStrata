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

export const TierLabel = memo(({
  tierId,
  title,
  color,
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

  const textColor = getTextColorForBackground(color);

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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div
      ref={droppableRef || wrapperRef}
      style={{ backgroundColor: color }}
      className="nb-rank-box group/label relative shrink-0 overflow-hidden"
      onDoubleClick={() => setIsEditing(true)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="nb-display-lg w-full bg-transparent text-center outline-none border-none"
          style={{ color: textColor === "black" ? "#000000" : "#ffffff" }}
        />
      ) : (
        <span
          className="nb-display-lg select-none"
          style={{ color: textColor === "black" ? "#000000" : "#ffffff" }}
        >
          {title}
        </span>
      )}

      <div className="absolute bottom-1 right-1 opacity-0 transition-opacity group-hover/label:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPaletteOpen(!isPaletteOpen);
          }}
          className="nb-heavy-border flex size-6 items-center justify-center bg-black text-white hover:bg-white hover:text-black transition-colors"
          title="Изменить цвет"
        >
          <Palette size={12} />
        </button>
      </div>

      {isPaletteOpen && (
        <div className="nb-heavy-border absolute left-full top-0 z-20 ml-2 flex w-32 flex-wrap gap-1 bg-white p-2 shadow-[4px_4px_0_0_#000000]">
          {TIER_COLORS.map((swatchColor) => (
            <div
              key={swatchColor}
              role="button"
              tabIndex={0}
              onClick={() => {
                onChangeColor(tierId, swatchColor);
                setIsPaletteOpen(false);
              }}
              style={{ backgroundColor: swatchColor }}
              className="size-5 cursor-pointer nb-heavy-border border-[1px]"
              aria-label={`Выбрать цвет ${swatchColor}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TierLabel.displayName = "TierLabel";
