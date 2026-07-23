import { useState, useRef, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerPopoverProps {
  currentColor: string;
  onChangeColor: (color: string) => void;
  onClose: () => void;
}

/** Базовые цвета для быстрого выбора */
const PRESET_COLORS = [
  "#FF0000", // Красный
  "#FF69B4", // Розовый
  "#FFA500", // Оранжевый
  "#FFD700", // Жёлтый
  "#32CD32", // Зелёный
  "#00CED1", // Голубой
  "#1E90FF", // Синий
  "#9370DB", // Фиолетовый
  "#FFFFFF", // Белый
  "#808080", // Серый
  "#000000", // Чёрный
];

/** Проверяет, является ли строка валидным hex-цветом (3 или 6 символов, без #) */
function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(str);
}

/** Нормализует hex: расширяет 3 символа до 6, добавляет # */
function normalizeHex(hex: string): string {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, "");
  if (cleaned.length === 3) {
    return `#${cleaned
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  return `#${cleaned.toUpperCase()}`;
}

export function ColorPickerPopover({
  currentColor,
  onChangeColor,
  onClose,
}: ColorPickerPopoverProps) {
  const [color, setColor] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor.replace("#", ""));
  const popoverRef = useRef<HTMLDivElement>(null);

  // Применяем цвет сразу при выборе из круга
  const handlePickerChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      setHexInput(newColor.replace("#", "").toUpperCase());
      onChangeColor(newColor);
    },
    [onChangeColor],
  );

  // Применяем цвет из HEX-инпута
  const applyHex = useCallback(
    (raw: string) => {
      if (!isValidHex(raw)) return;
      const newColor = normalizeHex(raw);
      setColor(newColor);
      setHexInput(newColor.replace("#", ""));
      onChangeColor(newColor);
    },
    [onChangeColor],
  );

  // Debounce для автоматического применения HEX при вводе
  const hexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    setHexInput(raw);

    // Сбрасываем предыдущий таймер
    if (hexTimerRef.current) {
      clearTimeout(hexTimerRef.current);
    }

    // Если введён полный 6-символьный код — ставим debounce 300ms
    if (raw.length === 6) {
      hexTimerRef.current = setTimeout(() => {
        applyHex(raw);
      }, 300);
    }
  };

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (hexTimerRef.current) {
        clearTimeout(hexTimerRef.current);
      }
    };
  }, []);

  const handleHexSubmit = () => {
    if (hexTimerRef.current) {
      clearTimeout(hexTimerRef.current);
    }
    if (isValidHex(hexInput)) {
      applyHex(hexInput);
    } else {
      // Сброс на текущий цвет, если введён невалидный код
      setHexInput(color.replace("#", ""));
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleHexSubmit();
    }
  };

  const handleSwatchPick = useCallback(
    (swatch: string) => {
      setColor(swatch);
      setHexInput(swatch.replace("#", "").toUpperCase());
      onChangeColor(swatch);
      onClose();
    },
    [onChangeColor, onClose],
  );

  // Закрытие по Escape / клику вне
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="nb-heavy-border absolute left-full top-0 z-50 ml-2 bg-white p-3 shadow-[4px_4px_0_0_#000000]"
      style={{ width: "220px" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Цветовой круг */}
      <div className="mb-3">
        <HexColorPicker
          color={color}
          onChange={handlePickerChange}
          style={{ width: "100%", height: "160px" }}
        />
      </div>

      {/* Текущий цвет + HEX-ввод */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className="size-8 shrink-0 rounded border border-black"
          style={{ backgroundColor: color }}
        />
        <div className="flex flex-1 items-center gap-1">
          <span className="text-sm font-bold text-gray-500">#</span>
          <input
            value={hexInput}
            onChange={handleHexChange}
            onBlur={handleHexSubmit}
            onKeyDown={handleHexKeyDown}
            className="w-full border border-gray-300 bg-gray-50 px-1.5 py-1 text-xs font-mono uppercase text-gray-900 outline-none focus:border-black"
            placeholder="FF6B6B"
            maxLength={6}
            aria-label="HEX код цвета"
          />
        </div>
      </div>

      {/* Разделитель */}
      <div className="mb-2 border-t border-gray-200" />

      {/* Предустановленные цвета */}
      <div className="flex flex-wrap gap-1" role="group" aria-label="Основные цвета">
        {PRESET_COLORS.map((swatch) => (
          <button
            key={swatch}
            onClick={(e) => {
              e.stopPropagation();
              handleSwatchPick(swatch);
            }}
            style={{ backgroundColor: swatch }}
            className={`size-5 cursor-pointer border border-black hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 outline-none ${
              color.toLowerCase() === swatch.toLowerCase()
                ? "ring-2 ring-cyan-200 ring-offset-2"
                : ""
            }`}
            aria-label={`Выбрать цвет: ${swatch}`}
            title={swatch}
          />
        ))}
      </div>
    </div>
  );
}
