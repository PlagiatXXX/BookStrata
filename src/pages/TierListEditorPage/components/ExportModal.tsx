import { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Download } from 'lucide-react';
import Spinner from '@/components/Spinner/Spinner';
import { THEME_COLORS } from '@/lib/tierListApi';
import type { TierListTheme } from '@/lib/tierListApi';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => Promise<void>;
  tierListTheme?: string;
}

export const ExportModal = ({ isOpen, onClose, onExport, tierListTheme = 'default' }: ExportModalProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const colors = THEME_COLORS[tierListTheme as TierListTheme] ?? THEME_COLORS.default;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
      window.ym?.(109755750, 'reachGoal', 'export_png')
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[90vw] sm:max-w-md">
      <div className="p-3 sm:p-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 border-b-4 border-black pb-4">
          <div className="nb-heavy-border bg-(--theme-surface-4) p-2 text-(--theme-accent-primary)">
            <Download size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="nb-display-lg text-lg tracking-tighter! sm:text-xl">Экспорт</h2>
            <p className="nb-label-md text-xs text-gray-500 sm:text-sm">
              Картинка скачается в стиле текущего редактора
            </p>
          </div>
        </div>

        {/* Hint */}
        <div
          className="flex flex-col gap-1 p-3 sm:p-4 nb-heavy-border"
          style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.tier }}
        >
          <span className="nb-label-md text-xs font-black uppercase tracking-wide sm:text-sm">
            Готово к скачиванию
          </span>
          <span className="text-[10px] leading-tight opacity-70 sm:text-xs">
            PNG-картинка со всеми тирами, книгами и водяным знаком bookstrata.ru
          </span>
        </div>

        {/* Actions — стилизованы под тему тир-листа */}
        <div className="mt-4 flex gap-2 sm:mt-5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center justify-center gap-1.5 flex-1 nb-heavy-border px-2 py-2 text-[10px] font-black tracking-wide uppercase transition-all hover:-translate-y-0.5 sm:px-4 sm:py-2 sm:text-xs"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.tier,
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex cursor-pointer items-center justify-center gap-1.5 flex-1 nb-heavy-border px-2 py-2 text-[10px] font-black tracking-wide uppercase transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed sm:px-4 sm:py-2 sm:text-xs"
            style={{
              backgroundColor: colors.tier,
              color: colors.bg,
              borderColor: colors.bg,
            }}
          >
            {isExporting ? (
              <Spinner size="sm" />
            ) : (
              <Download size={14} />
            )}
            {isExporting ? 'Создаём...' : 'Скачать PNG'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
