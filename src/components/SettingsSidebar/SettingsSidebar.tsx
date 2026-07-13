import { memo, useCallback, useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Minus,
  Globe,
  ImageDown,
  Share2,
  Check,
  Copy,
  Trash,
  Type,
  Search,
  Italic,
  CaseSensitive,
  Palette,
} from "lucide-react";
import type { Tier } from "@/types";
import { Switch } from "@/ui/Switch";
import { SaveButton } from "@/pages/TierListEditorPage/components/SaveButton";
import type { SaveStatus } from "@/pages/TierListEditorPage/hooks/useTierEditorSave";
import { useShare } from "@/hooks/useShare";

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

const actionButtonBase =
  "flex w-full items-center justify-center gap-2";

const primaryActionButtonClass = `nb-btn-primary ${actionButtonBase}`;
const secondaryActionButtonClass = `nb-btn-secondary ${actionButtonBase}`;
const dangerActionButtonClass = `${secondaryActionButtonClass} border-[#ff51fa] text-[#ff51fa] hover:bg-[#ff51fa]/10`;
const actionIconClass = "shrink-0";

interface SettingsSidebarProps {
  activeTier?: Tier;
  onUpdateTier?: (
    tierId: string,
    settings: Partial<Omit<Tier, "id" | "bookIds">>,
  ) => void;
  onAddRow?: () => void;
  onClearRows?: () => void;
  onDownloadImage?: () => void;
  shareUrl?: string;
  title?: string;
  onDeleteRating?: () => void;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  isTogglingPublic?: boolean;
  onFindBook?: () => void;
  saveStatus?: SaveStatus;
  lastSaved?: Date | null;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

export const SettingsSidebar = memo(({
  activeTier,
  onUpdateTier,
  onAddRow = () => {},
  onClearRows = () => {},
  onDownloadImage = () => {},
  shareUrl,
  title,
  onDeleteRating,
  isPublic = false,
  onTogglePublic,
  isTogglingPublic = false,
  onFindBook,
  saveStatus,
  lastSaved,
  hasUnsavedChanges,
  onSave,
}: SettingsSidebarProps) => {
  const height = activeTier?.height || 130;
  const labelSize = activeTier?.labelSize || "sm";
  const { getShareUrls, copyLink, copied, shareTo } = useShare();
  const [showSharePopover, setShowSharePopover] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Закрывать поповер при клике вне
  useEffect(() => {
    if (!showSharePopover) return;
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowSharePopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSharePopover]);

  const handleHeightChange = (direction: "increase" | "decrease") => {
    if (!activeTier) return;
    const newHeight =
      direction === "increase" ? height + 10 : Math.max(80, height - 10);
    onUpdateTier?.(activeTier.id, { height: newHeight });
  };

  const handleLabelSizeChange = (direction: "increase" | "decrease") => {
    if (!activeTier) return;
    const sizes: ("xs" | "sm" | "md")[] = ["xs", "sm", "md"];
    const currentIndex = sizes.indexOf(labelSize);
    let newIndex =
      direction === "increase" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= sizes.length) newIndex = sizes.length - 1;
    const newSize = sizes[newIndex];
    onUpdateTier?.(activeTier.id, { labelSize: newSize });
  };

  const handleWeightChange = useCallback((weight: Tier["labelWeight"]) => {
    if (!activeTier) return;
    onUpdateTier?.(activeTier.id, { labelWeight: weight });
  }, [activeTier, onUpdateTier]);

  const handleStyleToggle = useCallback(() => {
    if (!activeTier) return;
    const next = activeTier.labelStyle === "italic" ? "normal" : "italic";
    onUpdateTier?.(activeTier.id, { labelStyle: next });
  }, [activeTier, onUpdateTier]);

  const handleLabelColorChange = useCallback((color: string) => {
    if (!activeTier) return;
    onUpdateTier?.(activeTier.id, { labelColor: color || undefined });
  }, [activeTier, onUpdateTier]);

  return (
    <aside className="nb-sidebar relative flex w-full flex-col text-white lg:w-80">
      {onFindBook && (
        <div className="nb-section-header">
          <h3 className="nb-label-md mb-4 text-[#c1fffe]">Поиск в библиотеке / LiveLib</h3>
          <button
            onClick={onFindBook}
            className={primaryActionButtonClass}
          >
            <Search size={18} className={actionIconClass} />
            Найти книгу
          </button>
        </div>
      )}

      <div className="nb-section-header">
        <h3 className="nb-label-md mb-4 text-[#c1fffe]">Управление блоками</h3>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => onAddRow()}
            className={secondaryActionButtonClass}
          >
            <Plus size={16} className={actionIconClass} />
            Добавить блок
          </button>
          <button
            onClick={onClearRows}
            className={dangerActionButtonClass}
          >
            <Trash2 size={16} className={actionIconClass} />
            Очистить блоки
          </button>
        </div>
      </div>

      {activeTier && (
        <div className="nb-section-header nb-sidebar-active-tier">
          <h3 className="nb-label-md mb-4 text-[#ffbd58]">Настройки: {activeTier.title}</h3>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="nb-label-md">Высота строки</span>
              <div className="flex items-center gap-2 nb-heavy-border bg-black p-1">
                <button
                  type="button"
                  onClick={() => handleHeightChange("decrease")}
                  aria-label="Уменьшить высоту строки"
                  className="flex size-8 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center nb-label-md">{height}</span>
                <button
                  type="button"
                  onClick={() => handleHeightChange("increase")}
                  aria-label="Увеличить высоту строки"
                  className="flex size-8 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="nb-label-md">Шрифт</span>
              <div className="flex items-center gap-2 nb-heavy-border bg-black p-1">
                <button
                  type="button"
                  onClick={() => handleLabelSizeChange("decrease")}
                  aria-label="Уменьшить размер шрифта"
                  className="flex size-8 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  <Type size={14} className="rotate-180" />
                </button>
                <span className="w-8 text-center nb-label-md uppercase">{labelSize}</span>
                <button
                  type="button"
                  onClick={() => handleLabelSizeChange("increase")}
                  aria-label="Увеличить размер шрифта"
                  className="flex size-8 items-center justify-center bg-black text-white hover:bg-[#c1fffe] hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  <Type size={14} />
                </button>
              </div>
            </div>

            {/* Начертание */}
            <div>
              <span className="nb-label-md mb-2 flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-widest">
                <CaseSensitive size={12} />
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
                      className={`flex-1 cursor-pointer nb-heavy-border px-1.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isActive
                          ? "bg-[#c1fffe] text-black shadow-[2px_2px_0_0_#000000]"
                          : "bg-black text-white hover:bg-gray-900"
                      }`}
                    >
                      {w === "thin" ? "100" : w === "normal" ? "400" : w === "bold" ? "700" : "900"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Стиль (курсив) */}
            <div className="flex items-center justify-between">
              <span className="nb-label-md flex items-center gap-1.5">
                <Italic size={13} />
                Курсив
              </span>
              <button
                type="button"
                onClick={handleStyleToggle}
                className={`cursor-pointer nb-heavy-border px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-all ${
                  activeTier?.labelStyle === "italic"
                    ? "bg-[#ff51fa] text-black shadow-[2px_2px_0_0_#000000]"
                    : "bg-black text-white hover:bg-gray-900"
                }`}
              >
                {activeTier?.labelStyle === "italic" ? "Вкл" : "Выкл"}
              </button>
            </div>

            {/* Цвет текста */}
            <div>
              <span className="nb-label-md mb-2 flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-widest">
                <Palette size={12} />
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
                      className={`nb-heavy-border size-6 cursor-pointer border transition-all ${
                        isActive
                          ? "scale-110 ring-2 ring-[#c1fffe] ring-offset-1 ring-offset-black"
                          : "hover:scale-110"
                      }`}
                      style={{
                        backgroundColor: c.color === "#888" ? undefined : c.color,
                        backgroundImage:
                          c.value === ""
                            ? "linear-gradient(45deg, #000 25%, #fff 25%, #fff 50%, #000 50%, #000 75%, #fff 75%)"
                            : undefined,
                        backgroundSize:
                          c.value === "" ? "6px 6px" : undefined,
                      }}
                      title={c.label}
                      aria-label={c.label}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-4 border-t border-[#c1fffe]/10 pt-4">
        {onTogglePublic && (
          <div className="flex items-center justify-between nb-heavy-border bg-black p-4">
            <label
              htmlFor="public-access-switch"
              className="flex cursor-pointer items-center gap-2"
            >
              <Globe size={16} className="text-[#c1fffe]" />
              <span className="nb-label-md">Публичный доступ</span>
            </label>
            <Switch
              id="public-access-switch"
              checked={isPublic}
              onCheckedChange={onTogglePublic}
              disabled={isTogglingPublic}
            />
          </div>
        )}

        {shareUrl && (
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => setShowSharePopover((v) => !v)}
              className={primaryActionButtonClass}
            >
              {copied ? (
                <Check size={16} className={actionIconClass} />
              ) : (
                <Share2 size={16} className={actionIconClass} />
              )}
              {copied ? "Скопировано" : "Поделиться"}
            </button>

            {showSharePopover && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-50 border-2 border-black bg-[#0e0e0e] p-3 shadow-[4px_4px_0_0_#000000]">
                <div className="grid grid-cols-2 gap-2">
                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={() => {
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
                    onClick={() => {
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
                  onClick={() => {
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
          </div>
        )}

        <button
          onClick={onDownloadImage}
          className={primaryActionButtonClass}
        >
          <ImageDown size={16} className={actionIconClass} />
          Скачать тир-лист
        </button>

        {onDeleteRating && (
          <button
            onClick={onDeleteRating}
            className={dangerActionButtonClass}
          >
            <Trash size={16} className={actionIconClass} />
            Удалить рейтинг
          </button>
        )}

        {onSave && saveStatus && (
          <SaveButton
            status={saveStatus}
            lastSaved={lastSaved ?? null}
            hasUnsavedChanges={hasUnsavedChanges ?? false}
            onSave={onSave}
          />
        )}
      </div>
    </aside>
  );
});
