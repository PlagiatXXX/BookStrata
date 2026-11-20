interface LogoProps {
  onClick?: () => void;
  /** Светлый вариант (для прозрачного хедера на светлых темах) */
  light?: boolean;
}

/**
 * Хэллоуинская тыква на логотипе.
 * Заменить картинку — положить свой файл в `public/` и поправить путь ниже
 * (png/webp/svg — любой формат, главное с прозрачным фоном).
 * Чтобы убрать тыкву — поставь `null`.
 */
const HALLOWEEN_PUMPKIN_SRC: string | null = null;

export const Logo = ({ onClick, light = false }: LogoProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
      aria-label="BookStrata - Книжное пространство"
    >
      <svg
        viewBox="0 0 180 48"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 w-30 xs:w-35 sm:w-40 md:w-45 h-auto overflow-visible"
      >
        {/* ICON - Animated 2.5D vector book tier strata */}
        <g transform="translate(4, 10)">
          {/* Top tier - S tier book */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 2 0; 0 0"
              dur="2.6s"
              repeatCount="indefinite"
            />
            {/* Корпус обложки */}
            <path
              d="M 4.5 0 L 34.5 0 Q 36.5 0 38 1.5 L 38 5.5 Q 36.5 7 34.5 7 L 4.5 7 Q 1.5 7 1.5 3.5 Q 1.5 0 4.5 0 Z"
              fill="url(#bookCoverS)"
            />
            {/* Корешок слева с тиснением */}
            <path
              d="M 4.5 0 Q 1.5 0 1.5 3.5 Q 1.5 7 4.5 7"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.8"
              strokeOpacity="0.85"
            />
            <line
              x1="5.6"
              y1="0.5"
              x2="5.6"
              y2="6.5"
              stroke="#1e1b4b"
              strokeWidth="0.6"
              strokeOpacity="0.65"
            />
            {/* Блок страниц со скосом в перспективе */}
            <polygon
              points="28,1.2 37.2,1.2 36.2,5.8 28,5.8"
              fill="url(#bookPages)"
            />
            <line
              x1="28.8"
              y1="2.6"
              x2="36.5"
              y2="2.6"
              stroke="#94a3b8"
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />
            <line
              x1="28.8"
              y1="4.2"
              x2="35.8"
              y2="4.2"
              stroke="#94a3b8"
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />
            {/* Неоновый контур обложки */}
            <path
              d="M 4.5 0.4 L 34.5 0.4 Q 36.5 0.4 37.8 1.5 L 37.8 5.5 Q 36.5 6.6 34.5 6.6"
              fill="none"
              stroke={light ? "#0284c7" : "#38bdf8"}
              strokeWidth="0.75"
              strokeOpacity="0.9"
            />
          </g>

          {/* Middle tier - A tier book */}
          <g transform="translate(0, 8.2)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 8.2; 1.4 8.2; 0 8.2"
              dur="2.6s"
              begin="0.25s"
              repeatCount="indefinite"
            />
            <path
              d="M 4.5 0 L 31.5 0 Q 33.5 0 35 1.5 L 35 5.5 Q 33.5 7 31.5 7 L 4.5 7 Q 1.5 7 1.5 3.5 Q 1.5 0 4.5 0 Z"
              fill="url(#bookCoverA)"
            />
            <path
              d="M 4.5 0 Q 1.5 0 1.5 3.5 Q 1.5 7 4.5 7"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.7"
              strokeOpacity="0.75"
            />
            <line
              x1="5.6"
              y1="0.5"
              x2="5.6"
              y2="6.5"
              stroke="#1e1b4b"
              strokeWidth="0.6"
              strokeOpacity="0.65"
            />
            <polygon
              points="26,1.2 34.2,1.2 33.2,5.8 26,5.8"
              fill="url(#bookPages)"
            />
            <line
              x1="26.8"
              y1="2.6"
              x2="33.5"
              y2="2.6"
              stroke="#94a3b8"
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />
            <line
              x1="26.8"
              y1="4.2"
              x2="32.8"
              y2="4.2"
              stroke="#94a3b8"
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />
            <path
              d="M 4.5 0.4 L 31.5 0.4 Q 33.5 0.4 34.8 1.5 L 34.8 5.5 Q 33.5 6.6 31.5 6.6"
              fill="none"
              stroke={light ? "#0284c7" : "#38bdf8"}
              strokeWidth="0.6"
              strokeOpacity="0.8"
            />
          </g>

          {/* Bottom tier - B tier book */}
          <g transform="translate(0, 16.4)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 16.4; 0.8 16.4; 0 16.4"
              dur="2.6s"
              begin="0.5s"
              repeatCount="indefinite"
            />
            <path
              d="M 4.5 0 L 28.5 0 Q 30.5 0 32 1.5 L 32 5.5 Q 30.5 7 28.5 7 L 4.5 7 Q 1.5 7 1.5 3.5 Q 1.5 0 4.5 0 Z"
              fill="url(#bookCoverB)"
            />
            <path
              d="M 4.5 0 Q 1.5 0 1.5 3.5 Q 1.5 7 4.5 7"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.6"
              strokeOpacity="0.6"
            />
            <line
              x1="5.6"
              y1="0.5"
              x2="5.6"
              y2="6.5"
              stroke="#0f172a"
              strokeWidth="0.6"
              strokeOpacity="0.65"
            />
            <polygon
              points="23,1.2 31.2,1.2 30.2,5.8 23,5.8"
              fill="url(#bookPages)"
            />
            <line
              x1="23.8"
              y1="2.6"
              x2="30.5"
              y2="2.6"
              stroke="#94a3b8"
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />
            <line
              x1="23.8"
              y1="4.2"
              x2="29.8"
              y2="4.2"
              stroke="#94a3b8"
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />
            <path
              d="M 4.5 0.4 L 28.5 0.4 Q 30.5 0.4 31.8 1.5 L 31.8 5.5 Q 30.5 6.6 28.5 6.6"
              fill="none"
              stroke={light ? "#0284c7" : "#38bdf8"}
              strokeWidth="0.6"
              strokeOpacity="0.6"
            />
          </g>
        </g>

        {/* TEXT - Main title */}
        <text
          x="52"
          y="24"
          fontSize="16"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="600"
          fill="url(#textGradient)"
        >
          BookStrata
        </text>

        {/* TEXT - Subtitle */}
        <text
          x="52"
          y="40"
          fontSize="10"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="400"
          fill="url(#textGradientSecondary)"
          letterSpacing="0.25"
        >
          Книжное пространство
        </text>

        {/* Gradients for text & book strata */}
        <defs>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor={light ? "#0f172a" : "#ffffff"} />
          </linearGradient>
          <linearGradient
            id="textGradientSecondary"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={light ? "#475569" : "#9ca3af"} />
            <stop offset="100%" stopColor={light ? "#334155" : "#6b7280"} />
          </linearGradient>

          {/* Book Strata Gradients */}
          <linearGradient id="bookCoverS" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="45%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="bookCoverA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="bookCoverB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="50%" stopColor="#3730a3" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient id="bookPages" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
        </defs>

        {/*
          Halloween pumpkin — картинка из public/ (см. HALLOWEEN_PUMPKIN_SRC).
          Позиция/размер — атрибуты x/y/width/height (координаты viewBox 180×48).
          Если файла нет — просто ничего не рисуется.
        */}
        {HALLOWEEN_PUMPKIN_SRC && (
          <image
            className="logo-pumpkin"
            href={HALLOWEEN_PUMPKIN_SRC}
            x="42"
            y="-10"
            width="34"
            height="30"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </svg>
    </button>
  );
};
