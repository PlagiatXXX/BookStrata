import { memo, useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Search, ImageDown, Share2, Check, Copy, Trash2, Globe, Save, Ellipsis,
  Minus, Type, CaseSensitive, Italic, Palette, Sliders,
} from "lucide-react";
import type { SaveStatus } from "../hooks/useTierEditorSave";
import type { Tier } from "@/types";
import { useBottomSafeOffset } from "@/hooks/useBottomSafeOffset";
import { useShare } from "@/hooks/useShare";

interface MobileToolbarProps {
  onSave: () => void;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  onFindBook?: () => void;
  onAddRow?: () => void;
  onDownloadImage: () => void;
  shareUrl?: string;
  title?: string;
  onClearRows?: () => void;
  onDeleteRating?: () => void;
  isPublic: boolean;
  onTogglePublic?: (value: boolean) => void;
  isTogglingPublic: boolean;
  // Настройки полок
  activeTier?: Tier;
  onUpdateTier?: (tierId: string, settings: Partial<Omit<Tier, "id" | "bookIds">>) => void;
}

const LABEL_COLORS = [
  { value: "", label: "Авто", color: "#888" },
  { value: "#ffffff", label: "Белый", color: "#ffffff" },
  { value: "#000000", label: "Чёрный", color: "#000000" },
  { value: "#ff4444", label: "Красный", color: "#ff4444" },
  { value: "#3b82f6", label: "Синий", color: "#3b82f6" },
  { value: "#f59e0b", label: "Золотой", color: "#f59e0b" },
  { value: "#22c55e", label: "Зелёный", color: "#22c55e" },
  { value: "#ec4899", label: "Розовый", color: "#ec4899" },
  { value: "#a855f7", label: "Фиолетовый", color: "#a855f7" },
  { value: "#ff8c00", label: "Оранжевый", color: "#ff8c00" },
  { value: "#00ffff", label: "Голубой", color: "#00ffff" },
] as const;

const btnBase =
  "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 py-2 text-[10px] uppercase font-black tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c1fffe] focus-visible:ring-inset";

const btnActive =
  "text-[#c1fffe]";
const btnInactive =
  "text-gray-400 hover:text-white";

export const MobileToolbar = memo(function MobileToolbar({
  onSave,
  saveStatus,
  lastSaved,
  hasUnsavedChanges,
  onFindBook,
  onAddRow,
  onDownloadImage,
  shareUrl,
  title,
  onClearRows,
  onDeleteRating,
  isPublic,
  onTogglePublic,
  isTogglingPublic,
  activeTier,
  onUpdateTier,
}: MobileToolbarProps) {
  const height = activeTier?.height || 130;
  const labelSize = activeTier?.labelSize || "sm";
  const { getShareUrls, copyLink, copied, shareTo } = useShare();
  const [showSharePopover, setShowSharePopover] = useState(false);

  const handleHeightChange = useCallback((direction: "increase" | "decrease") => {
    if (!activeTier || !onUpdateTier) return;
    const newHeight = direction === "increase" ? height + 10 : Math.max(80, height - 10);
    onUpdateTier(activeTier.id, { height: newHeight });
  }, [activeTier, onUpdateTier, height]);

  const handleLabelSizeChange = useCallback((direction: "increase" | "decrease") => {
    if (!activeTier || !onUpdateTier) return;
    const sizes: ("xs" | "sm" | "md")[] = ["xs", "sm", "md"];
    const currentIndex = sizes.indexOf(labelSize);
    const newIndex = Math.max(0, Math.min(sizes.length - 1, direction === "increase" ? currentIndex + 1 : currentIndex - 1));
    onUpdateTier(activeTier.id, { labelSize: sizes[newIndex] });
  }, [activeTier, onUpdateTier, labelSize]);

  const handleWeightChange = useCallback((weight: Tier["labelWeight"]) => {
    if (!activeTier || !onUpdateTier) return;
    onUpdateTier(activeTier.id, { labelWeight: weight });
  }, [activeTier, onUpdateTier]);

  const handleStyleToggle = useCallback(() => {
    if (!activeTier || !onUpdateTier) return;
    const next = activeTier.labelStyle === "italic" ? "normal" : "italic";
    onUpdateTier(activeTier.id, { labelStyle: next });
  }, [activeTier, onUpdateTier]);

  const handleLabelColorChange = useCallback((color: string) => {
    if (!activeTier || !onUpdateTier) return;
    onUpdateTier(activeTier.id, { labelColor: color || undefined });
  }, [activeTier, onUpdateTier]);

  const bottomOffset = useBottomSafeOffset();

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const [showTierPanel, setShowTierPanel] = useState(false);
  const tierPanelRef = useRef<HTMLDivElement>(null);
  const tierBtnRef = useRef<HTMLButtonElement>(null);

  // Закрываем выпадашки при клике вне
  useEffect(() => {
    if (!showMore && !showTierPanel) return;

    const handleClick = (e: MouseEvent) => {
      // "Ещё"
      if (showMore) {
        if (
          moreRef.current &&
          !moreRef.current.contains(e.target as Node) &&
          moreBtnRef.current &&
          !moreBtnRef.current.contains(e.target as Node)
        ) {
          setShowMore(false);
        }
      }
      // Полка
      if (showTierPanel) {
        if (
          tierPanelRef.current &&
          !tierPanelRef.current.contains(e.target as Node) &&
          tierBtnRef.current &&
          !tierBtnRef.current.contains(e.target as Node)
        ) {
          setShowTierPanel(false);
        }
      }
    };

    const timer = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [showMore, showTierPanel]);

  const saveLabel = () => {
    switch (saveStatus) {
      case "saving":
        return "Сохр...";
      case "saved":
        return "Ок";
      case "error":
        return "Ошибка";
      default:
        return hasUnsavedChanges ? "Сохранить" : "Сохр.";
    }
  };

  const saveIcon = () => {
    if (saveStatus === "saving") {
      return <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
    }
    return <Save size={20} />;
  };

  const saveColor = () => {
    if (saveStatus === "saving") return "text-gray-400";
    if (saveStatus === "saved") return "text-[#c1fffe]";
    if (saveStatus === "error") return "text-[#ff51fa]";
    if (hasUnsavedChanges) return "text-[#ffbd58]";
    return "text-gray-400";
  };

  return (
    <>
      {/* Основная панель */}
      <div className="fixed left-0 right-0 z-50 block border-t-4 border-black bg-[#0e0e0e] lg:hidden" style={{ bottom: bottomOffset }}>
        {/* Индикатор времени последнего сохранения */}
        {lastSaved && saveStatus !== "saving" && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-b bg-black px-2 text-[8px] uppercase tracking-wider text-gray-500">
            {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        <div className="flex items-stretch">
          {/* Save */}
          <button
            type="button"
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className={`${btnBase} ${saveColor()} border-r-2 border-black`}
            aria-label="Сохранить"
          >
            {saveIcon()}
            <span className="truncate max-w-full">{saveLabel()}</span>
          </button>

          {/* Search */}
          {onFindBook && (
            <button
              type="button"
              onClick={() => onFindBook()}
              className={`${btnBase} ${btnInactive} border-r-2 border-black`}
              aria-label="Найти книгу"
            >
              <Search size={20} />
              <span>Поиск книг</span>
            </button>
          )}

          {/* Add Tier */}
          {onAddRow && (
            <button
              type="button"
              onClick={() => onAddRow()}
              className={`${btnBase} ${btnInactive} border-r-2 border-black`}
              aria-label="Добавить блок"
            >
              <Plus size={20} />
              <span>Блок</span>
            </button>
          )}

          {/* Tier Settings (только когда на мобильном) */}
          <button
            ref={tierBtnRef}
            type="button"
            onClick={() => {
              if (activeTier) {
                setShowTierPanel((v) => !v);
                setShowMore(false);
              }
            }}
            className={`${btnBase} border-r-2 border-black ${
              activeTier
                ? showTierPanel
                  ? btnActive
                  : "text-gray-400 hover:text-white"
                : "text-gray-700"
            }`}
            aria-label="Настройки полки"
          >
            <Sliders size={20} />
            <span>Полка</span>
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={onDownloadImage}
            className={`${btnBase} ${btnInactive} border-r-2 border-black`}
            aria-label="Скачать тир-лист"
          >
            <ImageDown size={20} />
            <span>Экспорт</span>
          </button>

          {/* Share */}
          {shareUrl && (
            <button
              type="button"
              onClick={() => setShowSharePopover((v) => !v)}
              className={`${btnBase} ${copied || showSharePopover ? btnActive : btnInactive} border-r-2 border-black relative`}
              aria-label="Поделиться"
            >
              {copied ? <Check size={20} /> : <Share2 size={20} />}
              <span>{copied ? "Готово" : "Поделиться"}</span>

              {showSharePopover && (
                <div className="fixed left-1/2 z-50 w-64 -translate-x-1/2 border-4 border-black bg-[#0e0e0e] p-3 shadow-[4px_4px_0_0_#000000]" style={{ bottom: bottomOffset + 64 }}>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Telegram */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const t = title || "Тир-лист";
                        shareTo(getShareUrls({ url: shareUrl, title: t }).telegram);
                        setShowSharePopover(false);
                      }}
                      className="flex flex-col items-center gap-1 p-3 rounded hover:bg-white/10 transition-colors"
                      title="Telegram"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="size-7 text-[#c1fffe]">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z"/>
                      </svg>
                      <span className="text-xs uppercase font-bold text-gray-400">Telegram</span>
                    </button>

                    {/* VK */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const t = title || "Тир-лист";
                        shareTo(getShareUrls({ url: shareUrl, title: t }).vk);
                        setShowSharePopover(false);
                      }}
                      className="flex flex-col items-center gap-1 p-3 rounded hover:bg-white/10 transition-colors"
                      title="VK"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="size-7 text-[#c1fffe]">
                        <path d="M11.7 18h1.4s.4-.05.6-.2c.2-.15.2-.45.2-.45s-.03-1.3.6-1.5c.6-.2 1.4 1.3 2.2 1.8.6.4 1 .3 1 .3l2.2-.03s1.15-.07.6-.95c-.04-.07-.3-.65-1.6-1.85-1.3-1.2-1.1-1 .45-3.15 1-1.3 1.4-2.1 1.2-2.45-.1-.25-.8-.2-.8-.2l-2.3.02s-.17-.02-.3.07c-.13.08-.2.23-.2.23s-.3.8-.7 1.5c-.8 1.4-1.1 1.5-1.25 1.4-.3-.2-.2-.85-.2-1.3 0-1.4.2-2-.4-2.15-.2-.07-.5-.1-.8-.1-1.2 0-2.2.75-2.2.75s-.45.25-.6.35c0 0-.07.03-.1.05h-.02v.02s0-.02-.02-.02c-.07-.07-.1-.1-.1-.1s-.6-.65-1-.9C9.5 6.3 8.9 6 8.9 6s-.75-.2-.4.3c.25.4.8 1.2 1.1 1.6.4.6.5.9.5.9s.2.35.1.65c-.15.4-.8 1.7-1.1 2-.2.2-.5.2-.7.15-.5-.1-1.1-.75-1.6-1.5C6.4 9.5 6 8.8 6 8.8s-.1-.25-.25-.35c-.2-.1-.5-.1-.5-.1l-2.2.02s-.33.01-.45.15c-.1.15 0 .45 0 .45s1.3 3.1 2.9 4.7c1.4 1.4 3 1.3 3 1.3h.7z"/>
                      </svg>
                      <span className="text-xs uppercase font-bold text-gray-400">VK</span>
                    </button>
                  </div>

                {/* Copy link */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink(shareUrl);
                    setShowSharePopover(false);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-[#c1fffe]/20 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-gray-300 transition-colors hover:bg-white/5"
                >
                  <Copy size={14} className="text-[#c1fffe]" />
                  {copied ? "Скопировано" : "Копировать ссылку"}
                </button>
                </div>
              )}
            </button>
          )}

          {/* More */}
          <button
            ref={moreBtnRef}
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`${btnBase} ${showMore ? btnActive : btnInactive}`}
            aria-label="Ещё"
          >
            <Ellipsis size={20} />
            <span>Ещё</span>
          </button>
        </div>
      </div>

      {/* Dropdown "Ещё" */}
      {showMore && (
        <div
          ref={moreRef}
          className="fixed left-1/2 z-50 w-64 -translate-x-1/2 border-4 border-black bg-[#0e0e0e] p-3 shadow-[4px_4px_0_0_#000000] lg:hidden" style={{ bottom: bottomOffset + 64 }}
        >
          <div className="flex flex-col gap-2">
            {/* Clear All */}
            {onClearRows && (
              <button
                type="button"
                onClick={() => { setShowMore(false); onClearRows(); }}
                className="flex items-center gap-3 border-2 border-[#ff51fa] px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#ff51fa] transition-colors hover:bg-[#ff51fa]/10"
              >
                <Trash2 size={16} />
                Очистить блоки
              </button>
            )}

            {/* Public Access */}
            {onTogglePublic && (
              <div className="flex items-center justify-between border-2 border-gray-700 px-3 py-2">
                <label className="flex cursor-pointer items-center gap-3 text-[11px] font-black uppercase tracking-wider text-gray-300">
                  <Globe size={16} className="text-[#c1fffe]" />
                  Публичный
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  disabled={isTogglingPublic}
                  onClick={() => onTogglePublic(!isPublic)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full border-2 border-black transition-colors ${
                    isPublic ? "bg-[#c1fffe]" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block size-3.5 rounded-full border-2 border-black bg-white transition-transform ${
                      isPublic ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Delete Rating */}
            {onDeleteRating && (
              <button
                type="button"
                onClick={() => { setShowMore(false); onDeleteRating(); }}
                className="flex items-center gap-3 border-2 border-[#ff51fa] px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#ff51fa] transition-colors hover:bg-[#ff51fa]/10"
              >
                <Trash2 size={16} />
                Удалить рейтинг
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dropdown настроек полки */}
      {showTierPanel && activeTier && onUpdateTier && (
        <div
          ref={tierPanelRef}
          className="fixed left-1/2 z-50 w-72 -translate-x-1/2 border-4 border-black bg-[#0e0e0e] p-3 shadow-[4px_4px_0_0_#000000] lg:hidden" style={{ bottom: bottomOffset + 64 }}
        >
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#ffbd58]">
            Полка: {activeTier.title}
          </div>

          {/* Высота строки */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Высота</span>
            <div className="flex items-center gap-1 border-2 border-black bg-black">
              <button
                type="button"
                onClick={() => handleHeightChange("decrease")}
                className="flex size-7 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black"
              >
                <Minus size={12} />
              </button>
              <span className="w-6 text-center text-[11px] font-black">{height}</span>
              <button
                type="button"
                onClick={() => handleHeightChange("increase")}
                className="flex size-7 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Размер шрифта */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Шрифт</span>
            <div className="flex items-center gap-1 border-2 border-black bg-black">
              <button
                type="button"
                onClick={() => handleLabelSizeChange("decrease")}
                className="flex size-7 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black"
              >
                <Type size={12} className="rotate-180" />
              </button>
              <span className="w-6 text-center text-[11px] font-black uppercase">{labelSize}</span>
              <button
                type="button"
                onClick={() => handleLabelSizeChange("increase")}
                className="flex size-7 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black"
              >
                <Type size={12} />
              </button>
            </div>
          </div>

          {/* Начертание */}
          <div className="mb-3">
            <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <CaseSensitive size={11} />
              Начертание
            </span>
            <div className="flex gap-1">
              {(["thin", "normal", "bold", "black"] as const).map((w) => {
                const isActive = (activeTier?.labelWeight ?? "black") === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleWeightChange(w)}
                    className={`flex-1 cursor-pointer border-2 border-black px-1 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? "bg-[#c1fffe] text-black"
                        : "bg-black text-white hover:bg-gray-900"
                    }`}
                  >
                    {w === "thin" ? "100" : w === "normal" ? "400" : w === "bold" ? "700" : "900"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Курсив */}
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
              <Italic size={12} />
              Курсив
            </span>
            <button
              type="button"
              onClick={handleStyleToggle}
              className={`cursor-pointer border-2 border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTier?.labelStyle === "italic"
                  ? "bg-[#ff51fa] text-black"
                  : "bg-black text-white hover:bg-gray-900"
              }`}
            >
              {activeTier?.labelStyle === "italic" ? "Вкл" : "Выкл"}
            </button>
          </div>

          {/* Цвет текста */}
          <div>
            <span className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <Palette size={11} />
              Цвет текста
            </span>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLORS.map((c) => {
                const isActive = (activeTier?.labelColor ?? "") === c.value;
                return (
                  <button
                    key={c.value || "auto"}
                    type="button"
                    onClick={() => handleLabelColorChange(c.value)}
                    className={`size-5 cursor-pointer border-2 border-black transition-all ${
                      isActive ? "scale-110 ring-2 ring-[#c1fffe]" : "hover:scale-110"
                    }`}
                    style={{
                      backgroundColor: c.color === "#888" ? undefined : c.color,
                      backgroundImage:
                        c.value === ""
                          ? "linear-gradient(45deg, #000 25%, #fff 25%, #fff 50%, #000 50%, #000 75%, #fff 75%)"
                          : undefined,
                      backgroundSize: c.value === "" ? "5px 5px" : undefined,
                    }}
                    title={c.label}
                    aria-label={c.label}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
});
