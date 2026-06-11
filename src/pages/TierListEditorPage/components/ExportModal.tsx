import { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Download, Check } from 'lucide-react';
import Spinner from '@/components/Spinner/Spinner';
import { THEME_COLORS } from '@/lib/tierListApi';
import type { TierListTheme } from '@/lib/tierListApi';

export type ExportTheme = 'default' | 'minimalist' | 'vintage' | 'cyberpunk';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (theme: ExportTheme) => Promise<void>;
  tierListTheme?: string;
}

interface ThemeCard {
  id: ExportTheme;
  name: string;
  description: string;
  bg: string;
  accent: string;
  labelBg: string;
  labelText: string;
  labelAccent: string;
}

const THEMES: ThemeCard[] = [
  {
    id: 'default',
    name: 'Стандарт',
    description: 'Оригинальный нео-брутализм',
    bg: '#242424',
    accent: '#bf00e6',
    labelBg: '#1a1a1a',
    labelText: '#f6f1e8',
    labelAccent: '#c1fffe',
  },
  {
    id: 'minimalist',
    name: 'Минимализм',
    description: 'Чистый белый стиль для печати',
    bg: '#f8f8f8',
    accent: '#111827',
    labelBg: '#ffffff',
    labelText: '#111827',
    labelAccent: '#3b82f6',
  },
  {
    id: 'vintage',
    name: 'Винтаж',
    description: 'Текстура старой бумаги',
    bg: '#f4ecd8',
    accent: '#5d4037',
    labelBg: '#e8dcc8',
    labelText: '#3e2723',
    labelAccent: '#8d6e63',
  },
  {
    id: 'cyberpunk',
    name: 'Киберпанк',
    description: 'Неон и тёмное будущее',
    bg: '#0a0a0a',
    accent: '#00ff00',
    labelBg: '#000000',
    labelText: '#00ff00',
    labelAccent: '#ff00ff',
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[90vw] sm:max-w-lg">
      <div className="p-3 sm:p-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 border-b-4 border-black pb-4">
          <div className="nb-heavy-border bg-black p-2 text-[#c1fffe]">
            <Download size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="nb-display-lg text-lg tracking-tighter! sm:text-xl">Экспорт</h2>
            <p className="nb-label-md text-xs text-gray-500 sm:text-sm">Выбери стиль и скачай PNG</p>
          </div>
        </div>

        {/* Theme cards — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 p-3 nb-heavy-border" style={{ backgroundColor: '#2a2a2a' }}>
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={`group relative flex flex-col nb-heavy-border cursor-pointer text-left transition-all
                  ${isSelected
                    ? 'shadow-[4px_4px_0_0_#000000] -translate-y-0.5'
                    : 'hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#000000]'
                  }`}
                style={{
                  backgroundColor: theme.labelBg,
                  color: theme.labelText,
                }}
              >
                {/* Visual preview */}
                <div
                  className="relative flex h-24 items-center justify-center border-b-2 border-black sm:h-28"
                  style={{ backgroundColor: theme.bg }}
                >
                  {/* Simulated tier row preview */}
                  <div className="flex w-[85%] flex-col gap-1.5">
                    <div
                      className="h-5 rounded-sm border border-black/20"
                      style={{ backgroundColor: theme.labelBg, opacity: 0.9 }}
                    >
                      <div className="flex h-full items-center px-2">
                        <span
                          className="text-[8px] font-black uppercase tracking-wider sm:text-[10px]"
                          style={{ color: theme.labelText }}
                        >
                          S
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-8 flex-1 rounded-sm border border-black/15 sm:h-10"
                          style={{
                            backgroundColor: theme.accent,
                            opacity: 0.7 + i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Checkmark on selected */}
                  {isSelected && (
                    <div className="absolute -right-2 -top-2 flex size-6 items-center justify-center nb-heavy-border border-2 border-black bg-[#ff51fa]">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-0.5 px-3 py-2.5 sm:px-4 sm:py-3">
                  <span className="nb-label-md text-xs font-black uppercase tracking-wide sm:text-sm">
                    {theme.name}
                  </span>
                  <span className="text-[10px] opacity-60 leading-tight sm:text-xs">
                    {theme.description}
                  </span>
                </div>
              </button>
            );
          })}
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
