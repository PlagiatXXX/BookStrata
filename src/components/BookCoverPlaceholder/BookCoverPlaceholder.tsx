interface BookCoverPlaceholderProps {
  className?: string;
  compact?: boolean;
}

export function BookCoverPlaceholder({ className = "", compact = false }: BookCoverPlaceholderProps) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] ${className}`}
    >
      {/* Иконка книги */}
      <svg
        viewBox="0 0 96 128"
        className={`${compact ? "w-5 h-7 mb-1" : "w-8 h-11 mb-2 sm:w-10 sm:h-14 sm:mb-3"} opacity-50`}
        aria-hidden="true"
      >
        <rect x="2" y="2" width="92" height="124" rx="6" fill="#333" stroke="#444" strokeWidth="2" />
        <rect x="12" y="12" width="72" height="104" rx="3" fill="#2a2a2a" />
        <line x1="24" y1="36" x2="72" y2="36" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="52" x2="72" y2="52" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="68" x2="72" y2="68" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="84" x2="72" y2="84" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {/* Текст */}
      <span className={`${compact ? "text-[7px]" : "text-[9px] sm:text-xs"} font-black tracking-[0.2em] text-[#e2e8f0] opacity-60 select-none`}>
        BOOKSTRATA
      </span>
    </div>
  );
}
