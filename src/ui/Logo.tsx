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
const HALLOWEEN_PUMPKIN_SRC: string | null = "/halloween-pumpkin.webp";

export const Logo = ({ onClick, light = false }: LogoProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
      aria-label="BookStrata - Рейтинг всего"
    >
      <svg
        viewBox="0 0 180 48"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 w-30 xs:w-35 sm:w-40 md:w-45 h-auto overflow-visible"
      >
        {/* ICON - Animated 3D book tier strata */}
        <g transform="translate(4, 11)">
          {/* Top tier - S tier book */}
          <g>
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.05;1"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.92;1;0.92"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <image
              href="/brand/book-tier-top.webp"
              x="0"
              y="0"
              width="40"
              height="10"
              preserveAspectRatio="none"
            />
          </g>

          {/* Middle tier - A tier book */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;2.5 0;0 0"
              dur="2.4s"
              begin="0.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.85;1;0.85"
              dur="2.4s"
              begin="0.2s"
              repeatCount="indefinite"
            />
            <image
              href="/brand/book-tier-mid.webp"
              x="0"
              y="8.8"
              width="40"
              height="7.2"
              preserveAspectRatio="none"
            />
          </g>

          {/* Bottom tier - B tier book */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;1.5 0;0 0"
              dur="2.4s"
              begin="0.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.75;0.95;0.75"
              dur="2.4s"
              begin="0.4s"
              repeatCount="indefinite"
            />
            <image
              href="/brand/book-tier-bot.webp"
              x="0"
              y="15.2"
              width="40"
              height="7.5"
              preserveAspectRatio="none"
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
          letterSpacing="0.5"
        >
          Рейтинг всего
        </text>

        {/* Gradients for text */}
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
