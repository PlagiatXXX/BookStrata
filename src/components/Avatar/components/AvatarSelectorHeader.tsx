import { X } from 'lucide-react';
import type { AvatarSelectorHeaderProps } from '../types';

export function AvatarSelectorHeader({ onClose }: AvatarSelectorHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-white dark:text-white light:text-gray-900">
        Выберите аватар
      </h2>
      <button
        onClick={onClose}
        className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Закрыть"
      >
        <X size={20} />
      </button>
    </div>
  );
}
