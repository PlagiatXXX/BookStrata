import { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Download, Check, Sparkles } from 'lucide-react';
import { THEME_COLORS } from '@/lib/tierListApi';
import type { TierListTheme } from '@/lib/tierListApi';

export type ExportTheme = 'default' | 'minimalist' | 'vintage' | 'cyberpunk';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (theme: ExportTheme) => Promise<void>;
  tierListTheme?: string;
}

const THEMES: { id: ExportTheme; name: string; description: string; bg: string; accent: string }[] = [
  {
    id: 'default',
    name: 'Стандарт',
    description: 'Оригинальный нео-брутализм',
    bg: '#242424',
    accent: '#bf00e6',
  },
  {
    id: 'minimalist',
    name: 'Минимализм',
    description: 'Чистый белый стиль для печати',
    bg: '#ffffff',
    accent: '#111827',
  },
  {
    id: 'vintage',
    name: 'Винтаж',
    description: 'Текстура старой бумаги',
    bg: '#f4ecd8',
    accent: '#5d4037',
  },
  {
    id: 'cyberpunk',
    name: 'Киберпанк',
    description: 'Неон и тёмное будущее',
    bg: '#000000',
    accent: '#00ff00',
  },
];

export const ExportModal = ({ isOpen, onClose, onExport, tierListTheme = 'default' }: ExportModalProps) => {
  const [selectedTheme, setSelectedTheme] = useState<ExportTheme>('default');
  const [isExporting, setIsExporting] = useState(false);
  const colors = THEME_COLORS[tierListTheme as TierListTheme] ?? THEME_COLORS.default;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedTheme);
      window.ym?.(109755750, 'reachGoal', 'export_png')
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[90vw] sm:max-w-sm">
      <div className="p-2 sm:p-4">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 border-b-4 border-black pb-4">
          <div className="nb-heavy-border bg-black p-2 text-[#c1fffe]">
            <Download size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="nb-display-lg text-lg !tracking-tighter sm:text-xl">Экспорт</h2>
            <p className="nb-label-md text-xs text-gray-500 sm:text-sm">Скачать как PNG</p>
          </div>
        </div>

        {/* Themes */}
        <div className="space-y-4">
          <label className="nb-label-md flex items-center gap-2 text-xs text-black sm:text-sm">
            <Sparkles size={14} />
            Стиль оформления
          </label>
          <div className="grid grid-cols-1 gap-3">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`group relative flex items-center gap-3 nb-heavy-border p-0 text-left transition-all cursor-pointer
                    ${isSelected
                      ? 'bg-[#c1fffe] text-black shadow-[4px_4px_0_0_#000000] -translate-y-0.5'
                      : 'bg-white text-black hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#000000]'
                    }`}
                >
                  {/* Цветной превью-блок */}
                  <div
                    className="relative flex h-16 w-16 shrink-0 items-center justify-center border-r-2 border-black nb-heavy-border sm:h-20 sm:w-20"
                    style={{ backgroundColor: theme.bg }}
                  >
                    <div
                      className="h-8 w-8 nb-heavy-border border-2 sm:h-10 sm:w-10"
                      style={{ backgroundColor: theme.accent }}
                    />
                    {isSelected && (
                      <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center nb-heavy-border border-2 border-black bg-[#ff51fa] sm:h-6 sm:w-6">
                        <Check size={12} className="text-black sm:size-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Описание */}
                  <div className="flex-1 py-2 pr-3 min-w-0 sm:py-3 sm:pr-4">
                    <span className={`nb-label-md text-sm underline decoration-2 sm:text-base ${isSelected ? 'decoration-black' : 'decoration-gray-300 group-hover:decoration-black'}`}>
                      {theme.name}
                    </span>
                    <p className="nb-label-md mt-0.5 text-[10px] opacity-60 leading-tight sm:text-xs">
                      {theme.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions — стилизованы под тему тир-листа */}
        <div className="mt-6 flex gap-3 sm:mt-8 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center justify-center gap-2 flex-1 nb-heavy-border px-3 py-2.5 text-[11px] font-black tracking-wide uppercase transition-all hover:-translate-y-0.5 sm:px-6 sm:py-3 sm:text-sm"
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
            className="flex cursor-pointer items-center justify-center gap-2 flex-1 nb-heavy-border px-3 py-2.5 text-[11px] font-black tracking-wide uppercase transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed sm:px-6 sm:py-3 sm:text-sm"
            style={{
              backgroundColor: colors.tier,
              color: colors.bg,
              borderColor: colors.bg,
            }}
          >
            <Download size={16} className="sm:size-[18px]" />
            {isExporting ? 'Создаём...' : 'Скачать PNG'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
