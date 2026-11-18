import './AiLibrarianWidget.css'

interface AiLibrarianWidgetProps {
  onClick: () => void
  theme?: string | null
}

export function AiLibrarianWidget({ onClick, theme }: AiLibrarianWidgetProps) {
  const isRainTheme = theme === 'autumn-rain'
  const avatarSrc = isRainTheme ? '/bukstrazh-rain-avatar.webp' : '/cosmo2.webp'

  return (
    <div className={`ai-widget ${isRainTheme ? 'ai-widget--rain' : ''}`}>
      <button
        type="button"
        className="ai-widget__button"
        onClick={onClick}
        title="Спросить Букстража"
        aria-label="AI-библиотекарь Букстраж"
      >
        <img
          src={avatarSrc}
          alt="Букстраж"
          className="ai-widget__avatar"
          draggable={false}
        />
      </button>
    </div>
  )
}
