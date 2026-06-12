import { memo, useState, useRef, useEffect } from "react";
import { Plus, Search, ImageDown, Trash2, Globe, Save, Ellipsis } from "lucide-react";
import type { SaveStatus } from "../hooks/useTierEditorSave";

interface MobileToolbarProps {
  onSave: () => void;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  onFindBook?: () => void;
  onAddRow?: () => void;
  onDownloadImage: () => void;
  onClearRows?: () => void;
  onDeleteRating?: () => void;
  isPublic: boolean;
  onTogglePublic?: (value: boolean) => void;
  isTogglingPublic: boolean;
}

const btnBase =
  "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 py-1.5 text-[9px] uppercase font-black tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c1fffe] focus-visible:ring-inset";

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
  onClearRows,
  onDeleteRating,
  isPublic,
  onTogglePublic,
  isTogglingPublic,
}: MobileToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // Закрываем "ещё" при клике вне
  useEffect(() => {
    if (!showMore) return;
    const handleClick = (e: MouseEvent) => {
      if (
        moreRef.current &&
        !moreRef.current.contains(e.target as Node) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target as Node)
      ) {
        setShowMore(false);
      }
    };
    // Задержка, чтобы не закрыть сразу после открытия
    const timer = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [showMore]);

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
    return <Save size={18} />;
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
      <div className="fixed bottom-0 left-0 right-0 z-50 block border-t-4 border-black bg-[#0e0e0e] lg:hidden">
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
              <Search size={18} />
              <span>Поиск</span>
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
              <Plus size={18} />
              <span>Блок</span>
            </button>
          )}

          {/* Export */}
          <button
            type="button"
            onClick={onDownloadImage}
            className={`${btnBase} ${btnInactive} border-r-2 border-black`}
            aria-label="Скачать тир-лист"
          >
            <ImageDown size={18} />
            <span>Экспорт</span>
          </button>

          {/* More */}
          <button
            ref={moreBtnRef}
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`${btnBase} ${showMore ? btnActive : btnInactive}`}
            aria-label="Ещё"
          >
            <Ellipsis size={18} />
            <span>Ещё</span>
          </button>
        </div>
      </div>

      {/* Dropdown "Ещё" */}
      {showMore && (
        <div
          ref={moreRef}
          className="fixed bottom-16 left-1/2 z-50 w-64 -translate-x-1/2 border-4 border-black bg-[#0e0e0e] p-3 shadow-[4px_4px_0_0_#000000] lg:hidden"
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
                  onClick={() => { onTogglePublic(!isPublic); setShowMore(false); }}
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
    </>
  );
});
