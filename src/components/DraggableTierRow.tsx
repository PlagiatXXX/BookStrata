import { useDroppable } from '@dnd-kit/core';
import { TierRow } from '../components/TierRow/TierRow';
import { DraggableBookCover } from './DraggableBookCover';
import type { Tier, Book } from '@/types';

interface DroppableTierRowProps {
  tier: Tier;
  books: Book[];
}

export const DroppableTierRow = ({ tier, books }: DroppableTierRowProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id });

  return (
    <div ref={setNodeRef}>
       <TierRow 
         tier={tier} 
         books={books}
         isDropTarget={isOver} 
       />
    </div>
  );
}
