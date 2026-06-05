import { Book } from "lucide-react";

interface BookCounterProps {
  booksCount: number;
}

export function BookCounter({ booksCount }: BookCounterProps) {
  return (
    <div className="nb-heavy-border border border-black bg-black p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book size={18} className="text-cyan-400" />
          <span className="text-sm font-medium text-white">
            Книги в тир-листе
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-white">
            {booksCount}
          </span>
        </div>
      </div>
    </div>
  );
}
