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
  if (autoSaveStatus === 'idle') {
    return null;
  }

  if (autoSaveStatus === 'saving') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 nb-heavy-border bg-black px-4 py-2 text-sm text-[#c1fffe] shadow-[4px_4px_0_0_#000000]">
        <div className="h-2 w-2 animate-pulse bg-[#c1fffe]" />
        <span className="nb-label-md">Сохранение...</span>
      </div>
    );
  }

  if (autoSaveStatus === 'saved' && lastSaved) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 nb-heavy-border bg-black px-4 py-2 text-sm text-[#ffbd58] shadow-[4px_4px_0_0_#000000]">
        <div className="h-2 w-2 bg-[#ffbd58]" />
        <span className="nb-label-md">
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
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 nb-heavy-border bg-[#ff51fa] px-4 py-2 text-sm text-black shadow-[4px_4px_0_0_#000000]">
        <span className="nb-label-md">⚠️ Ошибка</span>
        <button
          onClick={onSaveRetry}
          className="ml-2 nb-heavy-border border-[1px] bg-white px-2 py-1 text-xs hover:bg-black hover:text-white cursor-pointer transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  return null;
};
