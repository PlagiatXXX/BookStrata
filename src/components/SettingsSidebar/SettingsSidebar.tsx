import { memo } from "react";
import {
  Plus,
  Trash2,
  Minus,
  Globe,
  ImageDown,
  Trash,
  Type,
  Search,
} from "lucide-react";
import type { Tier } from "@/types";
import { Switch } from "@/ui/Switch";

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
  onDeleteRating?: () => void;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  isTogglingPublic?: boolean;
  onFindBook?: () => void;
}

export const SettingsSidebar = memo(({
  activeTier,
  onUpdateTier,
  onAddRow = () => {},
  onClearRows = () => {},
  onDownloadImage = () => {},
  onDeleteRating,
  isPublic = false,
  onTogglePublic,
  isTogglingPublic = false,
  onFindBook,
}: SettingsSidebarProps) => {
  const height = activeTier?.height || 130;
  const labelSize = activeTier?.labelSize || "sm";

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

  return (
    <aside className="nb-sidebar flex w-full flex-col text-white lg:w-80">
      {onFindBook && (
        <div className="nb-section-header">
          <h3 className="nb-label-md mb-4 text-[#c1fffe]">Поиск в библиотеке</h3>
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
        <div className="nb-section-header">
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
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-4">
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
      </div>
    </aside>
  );
});
