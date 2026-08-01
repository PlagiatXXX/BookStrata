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
            <div className="h-3 w-3 animate-spin border-2 border-(--theme-border) border-t-transparent rounded-full" />
            <span>Сохранение...</span>
          </>
        );
      case 'saved':
        return <span>✅ Сохранено</span>;
      case 'error':
        return <span>⚠️ Ошибка (Повторить)</span>;
      default:
        return <span>Сохранить изменения</span>
    }
  };

  const getButtonClass = () => {
    const base = "flex items-center gap-2 nb-heavy-border px-4 py-2 text-sm font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--theme-bg)";

    if (status === 'saving') return `${base} bg-(--theme-surface-bright) text-(--theme-border) opacity-80 cursor-wait shadow-none`;
    if (status === 'saved') return `${base} bg-(--theme-accent-primary) text-(--theme-on-accent) shadow-(--theme-shadow)`;
    if (status === 'error') return `${base} bg-(--theme-accent-secondary) text-(--theme-on-accent) shadow-(--theme-shadow)`;
    if (hasUnsavedChanges) return `${base} bg-(--theme-accent-tertiary) text-(--theme-on-accent) shadow-(--theme-shadow)`;

    return `${base} bg-(--theme-surface-bright) text-(--theme-border) shadow-(--theme-shadow) opacity-60 hover:opacity-100`;
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onSave}
        disabled={status === 'saving'}
        className={getButtonClass()}
      >
        <div className="flex items-center gap-2">
        {getButtonContent()}
        </div>
      </button>
      {lastSaved && status !== 'saving' && (
        <span className="text-[10px] text-(--theme-text-muted) uppercase font-bold">
          Последнее: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
};
