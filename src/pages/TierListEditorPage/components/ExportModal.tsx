import { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Download, Check, ShieldCheck } from 'lucide-react';

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
      <div className="p-2">
        <div className="mb-8 flex items-center gap-4 border-b-4 border-black pb-6">
          <div className="nb-heavy-border bg-black p-3 text-[#c1fffe]">
            <Download size={32} />
          </div>
          <div>
            <h2 className="nb-display-lg text-2xl !tracking-tighter">Экспорт</h2>
            <p className="nb-label-md text-gray-500">Архивирование данных</p>
          </div>
        </div>

        <div className="space-y-6">
          <label className="nb-label-md text-black">Стиль оформления</label>
          <div className="grid grid-cols-1 gap-4">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative flex flex-col gap-2 nb-heavy-border p-4 text-left transition-all ${
                  selectedTheme === theme.id
                    ? 'bg-[#c1fffe] text-black shadow-[4px_4px_0_0_#000000]'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="nb-label-md text-lg underline decoration-2">{theme.name}</span>
                  {selectedTheme === theme.id && <Check size={20} className="text-black" />}
                </div>
                <p className="nb-label-md opacity-60 leading-tight">{theme.description}</p>
                <div className="mt-2 flex gap-2">
                  {theme.colors.map((c, i) => (
                    <div key={i} className="h-4 w-4 nb-heavy-border border-[1px]" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4 border-t-4 border-black pt-6">
            <div className="flex items-center justify-between bg-black p-4 text-white">
              <div className="flex items-center gap-3">
                <p className="nb-label-md">Водяной знак</p>
                <p className="nb-label-md text-[10px] opacity-60">BookStrata Pro • @{username}</p>
              </div>
              <button
                onClick={() => setShowWatermark(!showWatermark)}
                className={`relative h-8 w-14 nb-heavy-border transition-colors ${
                  showWatermark ? 'bg-[#ff51fa]' : 'bg-gray-800'
                }`}
              >
                <div className={`absolute top-1 h-4 w-4 bg-black transition-all ${
                  showWatermark ? 'left-8' : 'left-1'
                }`} />
              </button>
            </div>

            {!isPro && (
              <div className="nb-heavy-border bg-[#ffbd58]/20 p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-black shrink-0 mt-0.5" />
                <p className="nb-label-md text-[10px] text-black leading-snug">
                  Удаление водяного знака доступно только пользователям с <strong>Pro подпиской</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <button
            onClick={onClose}
            className="nb-btn-secondary flex-1"
          >
            Отмена
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="nb-btn-primary flex-1"
          >
            {isExporting ? 'Создаем...' : 'Скачать PNG'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
