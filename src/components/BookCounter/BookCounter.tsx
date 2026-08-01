import { Book } from "lucide-react";

interface BookCounterProps {
  booksCount: number;
}

export function BookCounter({ booksCount }: BookCounterProps) {
  return (
    <div className="nb-heavy-border bg-(--theme-surface-4) px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Book size={15} className="text-(--theme-accent-primary)" />
          <span className="text-xs font-medium text-(--theme-text)">
            Книги в тир-листе
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-(--theme-text)">
            {booksCount}
          </span>
        </div>
      </div>
    </div>
  );
}
