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

interface SettingsSidebarProps {
  activeTier?: Tier;
  onUpdateTier?: (
    tierId: string,
    settings: Partial<Omit<Tier, "id" | "bookIds">>,
  ) => void;
  onAddRow?: () => void;
  onClearRows?: () => void;
  onDownloadImage?: () => void;
  onMyRatingsClick: () => void;
  onDeleteRating?: () => void;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  isTogglingPublic?: boolean;
  onFindBook?: () => void;
}

const sectionTitleClass =
  "mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80";
const panelButtonClass =
  "flex h-11 w-full cursor-pointer items-center justify-center rounded-[12px] border text-sm font-semibold transition-colors";

export const SettingsSidebar = memo(({
  activeTier,
  onUpdateTier,
  onAddRow = () => {},
  onClearRows = () => {},
  onDownloadImage = () => {},
  onMyRatingsClick,
  onDeleteRating,
  isPublic = false,
  onTogglePublic,
  isTogglingPublic = false,
  onFindBook,
}: SettingsSidebarProps) => {
  // Вычисляемые значения вместо useState + useEffect синхронизации
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
    <aside className="y2k-panel flex w-full flex-col overflow-y-auto text-[#d8f9ff] lg:w-80">
      {onFindBook && (
        <div className="border-b border-cyan-300/35 p-6">
          <h3 className={sectionTitleClass}>Поиск в библиотеке</h3>
          <button
            onClick={onFindBook}
            className={`${panelButtonClass} y2k-btn-ghost hover:-translate-y-px`}
          >
            <Search size={18} className="mr-2" />
            Найти книгу
          </button>
        </div>
      )}

      <div className="border-b border-cyan-300/35 p-6">
        <h3 className={sectionTitleClass}>Управление тирами</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onAddRow()}
            className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-[rgba(8,16,35,0.75)] p-3 transition-transform hover:-translate-y-px hover:border-fuchsia-300/65"
          >
            <Plus
              size={16}
              className="text-cyan-200/80 transition-colors group-hover:text-fuchsia-200"
            />
            <span className="text-sm font-semibold text-cyan-100">
              Добавить тир
            </span>
          </button>
          <button
            onClick={onClearRows}
            className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-[rgba(8,16,35,0.75)] p-3 transition-transform hover:-translate-y-px hover:border-fuchsia-300/65"
          >
            <Trash2
              size={14}
              className="text-cyan-200/80 transition-colors group-hover:text-fuchsia-200"
            />
            <span className="text-sm font-semibold text-cyan-100">
              Очистить тиры
            </span>
          </button>
        </div>
      </div>

      {activeTier && (
        <div className="border-b border-cyan-300/35 p-6">
          <h3 className={sectionTitleClass}>Настройки тира "{activeTier.title}"</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-cyan-100">
                Высота строки
              </span>
              <div className="flex items-center gap-2 rounded-[10px] border border-cyan-300/45 bg-[rgba(8,16,35,0.85)] p-1">
                <button
                  onClick={() => handleHeightChange("decrease")}
                  className="flex size-7 items-center justify-center rounded-lg text-cyan-200/75 transition-colors hover:bg-cyan-300/15 hover:text-fuchsia-200"
                  aria-label="Уменьшить высоту строки"
                >
                  <Minus size={14} />
                </button>
                <span
                  className="w-8 text-center text-xs font-semibold text-cyan-100"
                  aria-live="polite"
                >
                  {height}
                </span>
                <button
                  onClick={() => handleHeightChange("increase")}
                  className="flex size-7 items-center justify-center rounded-lg text-cyan-200/75 transition-colors hover:bg-cyan-300/15 hover:text-fuchsia-200"
                  aria-label="Увеличить высоту строки"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-cyan-100">
                Размер шрифта
              </span>
              <div className="flex items-center gap-2 rounded-[10px] border border-cyan-300/45 bg-[rgba(8,16,35,0.85)] p-1">
                <button
                  onClick={() => handleLabelSizeChange("decrease")}
                  className="flex size-7 items-center justify-center rounded-lg text-cyan-200/75 transition-colors hover:bg-cyan-300/15 hover:text-fuchsia-200"
                  aria-label="Уменьшить размер шрифта"
                >
                  <Type size={14} className="rotate-180" />
                </button>
                <span
                  className="w-8 text-center text-xs font-semibold uppercase text-cyan-100"
                  aria-live="polite"
                >
                  {labelSize}
                </span>
                <button
                  onClick={() => handleLabelSizeChange("increase")}
                  className="flex size-7 items-center justify-center rounded-lg text-cyan-200/75 transition-colors hover:bg-cyan-300/15 hover:text-fuchsia-200"
                  aria-label="Увеличить размер шрифта"
                >
                  <Type size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto border-t border-cyan-300/35 bg-[rgba(5,10,22,0.7)] p-6">
        <div className="flex flex-col gap-3 rounded-xl border border-cyan-300/45 bg-[rgba(8,16,35,0.82)] p-4">
          {onTogglePublic && (
            <div className="flex items-center justify-between border-b border-cyan-300/35 py-2">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-cyan-200/80" />
                <span className="text-sm font-medium text-cyan-100">
                  Публичный доступ
                </span>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={onTogglePublic}
                disabled={isTogglingPublic}
              />
            </div>
          )}

          <button
            onClick={onDownloadImage}
            className={`${panelButtonClass} y2k-btn-ghost hover:-translate-y-px`}
          >
            <ImageDown size={16} className="mr-2" />
            Скачать изображение
          </button>

          <button
            onClick={onMyRatingsClick}
            className={`${panelButtonClass} y2k-btn-ghost hover:-translate-y-px`}
          >
            Мои рейтинги
          </button>

          {onDeleteRating && (
            <button
              onClick={onDeleteRating}
              className={`${panelButtonClass} border-fuchsia-300/70 bg-[rgba(255,0,204,0.12)] text-fuchsia-100 hover:-translate-y-px hover:border-fuchsia-300`}
            >
              <Trash size={16} className="mr-2" />
              Удалить рейтинг
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 border-b border-cyan-300/35 p-6" />
    </aside>
  );
});
