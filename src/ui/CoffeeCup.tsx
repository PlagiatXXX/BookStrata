// src/ui/CoffeeCup.tsx
// Чашка кофе с анимированным дымком — иконка «Угостить» (замена голубя).
// Анимация пара — в globals.css (.coffee-steam / steamRise).
export function CoffeeCup({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Пар над чашкой */}
      <g className="coffee-steam">
        <path
          d="M8 7c-.9-.8.9-1.7 0-2.6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M12 7.5c-.9-.8.9-1.7 0-2.6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M16 7c-.9-.8.9-1.7 0-2.6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </g>
      {/* Ручка */}
      <path
        d="M16.5 9.7h1.7a1.9 1.9 0 0 1 0 3.8h-1.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Корпус чашки */}
      <path
        d="M4.5 8.7h11V14a5.5 5.5 0 0 1-5.5 5.5h0A5.5 5.5 0 0 1 4.5 14V8.7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Блюдце */}
      <path
        d="M3.5 19.8h13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}