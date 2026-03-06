import { Upload as UploadIcon } from 'lucide-react';
import type { UploadTabProps } from '../types';
import { MAX_FILE_SIZE_MB } from '../constants';

export function UploadTab({ onFileSelect, previewLoadState }: UploadTabProps) {
  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onFileSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Загрузить изображение с компьютера"
        className="border-2 border-dashed border-surface-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
      >
        <UploadIcon size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-300 font-medium mb-2">
          Перетащите изображение или нажмите для выбора
        </p>
        <p className="text-sm text-gray-500">
          JPG, PNG, WebP. Максимум {MAX_FILE_SIZE_MB}MB.
        </p>
      </div>

      {previewLoadState === 'loading' && (
        <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-300">
            Загружаем изображение. Это может занять немного времени.
          </p>
        </div>
      )}

      {previewLoadState === 'error' && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-sm text-red-400">
            Не удалось загрузить изображение. Попробуйте ещё раз.
          </p>
        </div>
      )}
    </div>
  );
}
