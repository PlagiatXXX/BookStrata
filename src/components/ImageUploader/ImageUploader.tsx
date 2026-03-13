// src/components/ImageUploader/ImageUploader.tsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus } from 'lucide-react';
import { sileo } from 'sileo';
import { MAX_BOOKS_PER_TIER_LIST } from '@/pages/DashboardPage/constants';

interface ImageUploaderProps {
  onUpload?: (files: File[]) => void;
  booksCount?: number;
  isPro?: boolean;
}

export const ImageUploader = ({ onUpload = () => {}, booksCount = 0, isPro = false }: ImageUploaderProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (isPro) return onUpload(acceptedFiles);

    const remainingBooks = MAX_BOOKS_PER_TIER_LIST - booksCount;
    
    if (booksCount >= MAX_BOOKS_PER_TIER_LIST) {
      sileo.action({
        title: 'Лимит книг',
        description: 'Достигнуто максимальное количество книг в тир-листе (20). Оформите Pro для неограниченного количества.',
        duration: 3000,
        button: {
          title: 'Оформить Pro',
          onClick: () => {
            // TODO: Здесь будет переход на страницу оплаты Pro-подписки
            console.log('Navigate to Pro subscription');
          },
        },
      });
      return;
    }

    if (acceptedFiles.length > remainingBooks) {
      sileo.error({
        title: 'Превышен лимит',
        description: `Можно добавить только ${remainingBooks} книг(и). Вы выбрали ${acceptedFiles.length}.`,
        duration: 3000,
      });
      acceptedFiles = acceptedFiles.slice(0, remainingBooks);
    }

    onUpload(acceptedFiles);
  }, [onUpload, booksCount, isPro]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/gif': [],
    },
    disabled: !isPro && booksCount >= MAX_BOOKS_PER_TIER_LIST,
  });

  const isDisabled = !isPro && booksCount >= MAX_BOOKS_PER_TIER_LIST;

  return (
    <div
      {...getRootProps()}
      className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed
                  border-surface-border text-gray-500 transition-colors
                  hover:border-primary hover:text-primary bg-black/20
                  ${isDragActive ? 'border-primary bg-primary/10' : ''}
                  ${isDisabled ? 'cursor-not-allowed opacity-50 hover:border-surface-border hover:text-gray-500' : ''}`}
    >
      <input {...getInputProps()} />
      <ImagePlus size={24} />
      <span className="text-center text-xs mt-1">
        {isDisabled ? 'Лимит книг' : isDragActive ? 'Отпустите файлы...' : 'Перетащите или выберите'}
      </span>
    </div>
  );
};
