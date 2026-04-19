import React from 'react';
import type { SaveStatus } from '../hooks/useTierEditorSave';

interface SaveButtonProps {
  status: SaveStatus;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  isReadOnly?: boolean;
}

export const SaveButton = ({
  status,
  lastSaved,
  hasUnsavedChanges,
  onSave,
  isReadOnly,
}: SaveButtonProps) => {
  if (isReadOnly) return null;

  const getButtonContent = () => {
    switch (status) {
      case 'saving':
        return (
          <>
            <div className="h-3 w-3 animate-spin border-2 border-black border-t-transparent rounded-full" />
            <span>Сохранение...</span>
          </>
        );
      case 'saved':
        return <span>✅ Сохранено</span>;
      case 'error':
        return <span>⚠️ Ошибка (Повторить)</span>;
      default:
        return <span>Сохранить</span>;
    }
  };

  const getButtonClass = () => {
    const base = "flex items-center gap-2 nb-heavy-border px-4 py-2 text-sm font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black";

    if (status === 'saving') return `${base} bg-white text-black opacity-80 cursor-wait shadow-none`;
    if (status === 'saved') return `${base} bg-[#c1fffe] text-black shadow-[4px_4px_0_0_#000000]`;
    if (status === 'error') return `${base} bg-[#ff51fa] text-black shadow-[4px_4px_0_0_#000000]`;
    if (hasUnsavedChanges) return `${base} bg-[#ffbd58] text-black shadow-[4px_4px_0_0_#000000]`;

    return `${base} bg-white text-black shadow-[4px_4px_0_0_#000000] opacity-60 hover:opacity-100`;
  };

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutHint = isMac ? '⌘S' : 'Ctrl+S';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onSave}
        disabled={status === 'saving'}
        className={getButtonClass()}
        aria-keyshortcuts={isMac ? "Meta+S" : "Control+S"}
      >
        <div className="flex items-center gap-2">
          {getButtonContent()}
          {!isReadOnly && status !== 'saving' && (
            <kbd className="hidden sm:inline-flex items-center justify-center min-w-[2.5rem] px-1.5 py-0.5 text-[10px] font-mono font-bold bg-black/5 rounded border border-black/10">
              {shortcutHint}
            </kbd>
          )}
        </div>
      </button>
      {lastSaved && status !== 'saving' && (
        <span className="text-[10px] text-gray-500 uppercase font-bold">
          Последнее: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
};
