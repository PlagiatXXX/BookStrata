import { useDraggable } from '@dnd-kit/core';
import { BookCover } from '@/ui/BookCover';
import type { Book } from '@/types';

interface DraggableBookCoverProps {
  book: Book;
}

export const DraggableBookCover = ({ book }: DraggableBookCoverProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: book.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <BookCover book={book} />
    </div>
  );
}
