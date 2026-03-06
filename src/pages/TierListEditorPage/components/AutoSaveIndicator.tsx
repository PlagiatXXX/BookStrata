import type { AutoSaveStatus } from '@/hooks/useAutoSaveOptimized';

export interface AutoSaveIndicatorProps {
  autoSaveStatus: AutoSaveStatus;
  lastSaved: Date | null;
  onSaveRetry: () => void;
}

export const AutoSaveIndicator = ({
  autoSaveStatus,
  lastSaved,
  onSaveRetry,
}: AutoSaveIndicatorProps) => {
  // Не рендерим ничего если статус 'idle'
  if (autoSaveStatus === 'idle') {
    return null;
  }

  if (autoSaveStatus === 'saving') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800/90 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur-[2px]">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <span>Сохранение...</span>
      </div>
    );
  }

  if (autoSaveStatus === 'saved' && lastSaved) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800/90 px-4 py-2 text-sm text-slate-400 shadow-lg backdrop-blur-[2px]">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>
          Сохранено{' '}
          {lastSaved.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    );
  }

  if (autoSaveStatus === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-[2px]">
        <span>⚠️ Ошибка сохранения</span>
        <button
          onClick={onSaveRetry}
          className="ml-2 rounded bg-white/20 px-2 py-1 text-xs hover:bg-white/30 cursor-pointer"
        >
          Повторить
        </button>
      </div>
    );
  }

  return null;
};
