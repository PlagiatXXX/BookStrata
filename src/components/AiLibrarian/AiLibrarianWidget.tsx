import './AiLibrarianWidget.css'

interface AiLibrarianWidgetProps {
  onClick: () => void
}

export function AiLibrarianWidget({ onClick }: AiLibrarianWidgetProps) {
  return (
    <div className="ai-widget">
      <button
        type="button"
        className="ai-widget__button"
        onClick={onClick}
        title="Спросить Букстража"
        aria-label="AI-библиотекарь Букстраж"
      >
        <img
          src="/cosmo2.webp"
          alt="Букстраж"
          className="ai-widget__avatar"
          draggable={false}
        />
      </button>
    </div>
  )
}
