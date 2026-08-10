interface LogoProps {
  onClick?: () => void;
  /** Светлый вариант (для прозрачного хедера на светлых темах) */
  light?: boolean;
}

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
        className="shrink-0 w-30 xs:w-35 sm:w-40 md:w-45 h-auto"
      >
        {/* ICON - Animated tier bars */}
        <g transform="translate(4, 10)">
          {/* Top tier - S tier */}
          <rect x="0" y="0" width="36" height="6" rx="3" fill="#8B7CFF">
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.08;1"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.9;1;0.9"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Middle tier - A tier */}
          <rect x="0" y="10" width="28" height="6" rx="3" fill="#6D5DF6">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;3 0;0 0"
              dur="2.4s"
              begin="0.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.75;0.95;0.75"
              dur="2.4s"
              begin="0.2s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Bottom tier - B tier */}
          <rect x="0" y="20" width="20" height="6" rx="3" fill="#4C3FFF">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;2 0;0 0"
              dur="2.4s"
              begin="0.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.85;0.6"
              dur="2.4s"
              begin="0.4s"
              repeatCount="indefinite"
            />
          </rect>
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
      </svg>
    </button>
  );
};
