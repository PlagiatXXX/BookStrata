/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { X } from 'lucide-react';

export interface BookViewModalProps {
  book: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (book: any) => void;
  isAdding?: boolean;
}
  
export const BookViewModal: React.FC<BookViewModalProps> = ({
  book,
  isOpen,
  onClose,
  onAdd,
  isAdding = false
}) => {
  if (!book) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative p-6">
        <button
          onClick={onClose}
           className="absolute right-4 top-4 opacity-50 hover:opacity-100"
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col md:flex-row gap-6">
          <img 
            src={book.coverImageUrl || book.image_url || '/images/books/placeholder.svg'} 
            alt={book.title}
            className="w-full md:w-40 aspect-2/3 object-cover brutal-border shadow-lg" 
          />
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-tight">{book.title}</h3>
            <p className="text-sm font-medium opacity-70">
              {book.author || book.author_name || 'Автор неизвестен'}
            </p>
            {book.description && (
              <p className="text-sm leading-relaxed opacity-80 mt-2 line-clamp-8">
                    {book.description}
                  </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              {onAdd && (
                <Button 
                  isLoading={isAdding} 
                  onClick={() => onAdd(book)}
                >
                  Добавить
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>Закрыть</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};