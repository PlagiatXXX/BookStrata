import { useDroppable } from '@dnd-kit/core';
import { TierRow } from '../components/TierRow/TierRow';
import type { Tier, Book } from '@/types';

interface DroppableTierRowProps {
  tier: Tier;
  books: Book[];
  onChangeColor: (tierId: string, newColor: string) => void;
  onRename: (tierId: string, newTitle: string) => void;
  onDelete: (tierId: string) => void;
  onSetActive: (tierId: string) => void;
  isActive: boolean;
  onDeleteBook: (bookId: string) => void;
}

export const DroppableTierRow = ({ 
  tier, 
  books,
  onChangeColor,
  onRename,
  onDelete,
  onSetActive,
  isActive,
  onDeleteBook,
}: DroppableTierRowProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id });

  return (
    <div ref={setNodeRef} className={isOver ? 'bg-primary/10' : ''}>
       <TierRow
         tier={tier}
         books={books}
         onChangeColor={onChangeColor}
         onRename={onRename}
         onDelete={onDelete}
         onSetActive={onSetActive}
         isActive={isActive}
         onDeleteBook={onDeleteBook}
       />
    </div>
  );
}
