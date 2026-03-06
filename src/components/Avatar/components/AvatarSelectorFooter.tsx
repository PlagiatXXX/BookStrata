import { Spinner } from '@/components/Spinner';
import type { AvatarSelectorFooterProps } from '../types';

export function AvatarSelectorFooter({
  hasSelection,
  isSaving,
  isBusy,
  onSave,
  onClose,
}: AvatarSelectorFooterProps) {
  const disabled = !hasSelection || isSaving || isBusy;

  return (
    <div className="flex gap-3 mt-6 pt-4 border-t border-surface-border">
      <button
        onClick={onClose}
        className="flex-1 py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
      >
        Отмена
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className={`relative flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
          hasSelection
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-primary/20 text-primary/50 cursor-not-allowed'
        }`}
      >
        <span className={isSaving ? 'opacity-0' : 'opacity-100'}>
          Сохранить
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity ${
            isSaving ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Spinner size="lg" className="border-white/90" />
          <span>Сохраняем...</span>
        </span>
      </button>
    </div>
  );
}
