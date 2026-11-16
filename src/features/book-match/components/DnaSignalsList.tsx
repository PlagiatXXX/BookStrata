// src/features/book-match/components/DnaSignalsList.tsx
// Наглядные бейджи-сигналы совпадений книги с персональным ДНК читателя.

import { Icon } from "@/components/Icon";
import type { DnaSignals } from "../domain/dnaSignals";

export interface DnaSignalsListProps {
  signals: DnaSignals;
}

export function DnaSignalsList({ signals }: DnaSignalsListProps) {
  const hasAnySignal =
    signals.isFavoriteAuthor ||
    signals.isDislikedGenre ||
    signals.isHolyGrailBook ||
    signals.kryptoniteRisk;

  if (!hasAnySignal) return null;

  return (
    <div
      role="group"
      className="flex flex-wrap gap-2 mt-3"
      aria-label="Сигналы соответствия ДНК"
    >
      {signals.isFavoriteAuthor && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Icon name="person" className="text-sm" />
          Любимый автор из твоего билета
        </span>
      )}

      {signals.isHolyGrailBook && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <Icon name="star" className="text-sm" />
          Входит в золотую тройку твоего ДНК
        </span>
      )}

      {signals.isDislikedGenre && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Icon name="warning" className="text-sm" />
          {signals.dislikedGenreName
            ? `Жанр «${signals.dislikedGenreName}» в твоем списке нежелательных`
            : "В твоем списке нежелательных жанров"}
        </span>
      )}

      {signals.kryptoniteRisk && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <Icon name="shield" className="text-sm" />
          Книга близка к твоему антиподу-криптониту
        </span>
      )}
    </div>
  );
}
