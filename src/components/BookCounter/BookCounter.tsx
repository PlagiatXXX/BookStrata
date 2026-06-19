import { Book } from "lucide-react";

interface BookCounterProps {
  booksCount: number;
}

export function BookCounter({ booksCount }: BookCounterProps) {
  return (
    <div className="nb-heavy-border border border-black bg-black px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Book size={15} className="text-cyan-400" />
          <span className="text-xs font-medium text-white">
            Книги в тир-листе
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-white">
            {booksCount}
          </span>
        </div>
      </div>
    </div>
  );
}
