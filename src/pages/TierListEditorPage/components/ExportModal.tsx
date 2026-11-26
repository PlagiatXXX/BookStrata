import { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Download, Share2, X } from 'lucide-react';
import Spinner from '@/components/Spinner/Spinner';
import { YM_GOALS } from '@/lib/ym-goals';
import { apiTrackEvent } from '@/lib/analyticsApi';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options?: { mode?: 'download' | 'share' }) => Promise<void>;
  tierListTheme?: string;
}

export const ExportModal = ({ isOpen, onClose, onExport }: ExportModalProps) => {
  const [exportingMode, setExportingMode] = useState<'download' | 'share' | null>(null);

  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof File !== 'undefined';

  const handleExport = async (mode: 'download' | 'share' = 'download') => {
    setExportingMode(mode);
    try {
      await onExport({ mode });
      window.ym?.(109755750, 'reachGoal', YM_GOALS.EXPORT_PNG);
      apiTrackEvent('export_png', { mode });
      if (mode === 'download') {
        onClose();
      }
    } finally {
      setExportingMode(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[92vw] sm:max-w-md">
      <div className="relative rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6 text-white shadow-2xl">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Закрыть"
          className="absolute right-4 top-4 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
        >
          <X size={15} />
        </button>

        {/* Шапка */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Download size={20} />
          </div>
          <div className="min-w-0 pr-6">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Экспорт изображения
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Тир-лист сохранится в высоком разрешении в текущем стиле
            </p>
          </div>
        </div>

        {/* Информационная плашка */}
        <div className="mb-6 rounded-xl border border-white/5 bg-slate-900/60 p-3.5 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-center gap-2 font-medium text-slate-200 mb-1">
            <span className="inline-block size-2 rounded-full bg-emerald-400" />
            <span>Готово к скачиванию</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-normal">
            PNG-картинка содержит все тиры, обложки книг и аккуратный водяной знак bookstrata.ru
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Отмена
          </button>
          {canShare && (
            <button
              type="button"
              onClick={() => handleExport('share')}
              disabled={exportingMode !== null}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/15 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingMode === 'share' ? (
                <Spinner size="sm" />
              ) : (
                <Share2 size={14} />
              )}
              <span>{exportingMode === 'share' ? 'Создаём...' : 'Поделиться'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleExport('download')}
            disabled={exportingMode !== null}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-200 transition-all hover:bg-emerald-500/30 hover:text-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-950/50"
          >
            {exportingMode === 'download' ? (
              <Spinner size="sm" />
            ) : (
              <Download size={14} />
            )}
            <span>{exportingMode === 'download' ? 'Создаём...' : 'Скачать PNG'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
