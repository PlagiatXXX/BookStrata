import React, { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Download, Check, Palette, User, ShieldCheck } from 'lucide-react';

export type ExportTheme = 'default' | 'minimalist' | 'vintage' | 'cyberpunk';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (theme: ExportTheme, showWatermark: boolean) => Promise<void>;
  username: string;
  isPro: boolean;
}

const THEMES: { id: ExportTheme; name: string; description: string; colors: string[] }[] = [
  { id: 'default', name: 'Стандарт', description: 'Оригинальный нео-брутализм', colors: ['#242424', '#bf00e6'] },
  { id: 'minimalist', name: 'Минимализм', description: 'Чистый белый стиль для печати', colors: ['#ffffff', '#111827'] },
  { id: 'vintage', name: 'Винтаж', description: 'Текстура старой бумаги', colors: ['#f4ecd8', '#5d4037'] },
  { id: 'cyberpunk', name: 'Киберпанк', description: 'Неон и темное будущее', colors: ['#000000', '#00ff00'] },
];

export const ExportModal = ({ isOpen, onClose, onExport, username, isPro }: ExportModalProps) => {
  const [selectedTheme, setSelectedTheme] = useState<ExportTheme>('default');
  const [showWatermark, setShowWatermark] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedTheme, showWatermark);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2 text-primary">
            <Download size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Настройки экспорта</h2>
            <p className="text-sm text-gray-400">Выберите стиль для вашей картинки</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Стиль оформления</label>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  selectedTheme === theme.id
                    ? 'border-primary bg-primary/5'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{theme.name}</span>
                  {selectedTheme === theme.id && <Check size={16} className="text-primary" />}
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">{theme.description}</p>
                <div className="mt-1 flex gap-1">
                  {theme.colors.map((c, i) => (
                    <div key={i} className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-400">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">Водяной знак</p>
                  <p className="text-xs text-gray-500">BookStrata Pro • @{username}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWatermark(!showWatermark)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  showWatermark ? 'bg-primary' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                  showWatermark ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            {!isPro && (
              <div className="rounded-lg bg-yellow-500/10 p-3 flex items-start gap-3 border border-yellow-500/20">
                <ShieldCheck size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-500/80 leading-snug">
                  Удаление водяного знака доступно только пользователям с <strong>Pro подпиской</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-white hover:bg-white/10 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 rounded-xl bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {isExporting ? 'Создаем...' : 'Скачать PNG'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
