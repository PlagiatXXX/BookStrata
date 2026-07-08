import { useState, useCallback } from 'react'
import './AiLibrarianCard.css'

interface AiLibrarianCardProps {
  isGuest: boolean
  onAskClick: () => void
}

export function AiLibrarianCard({ isGuest, onAskClick }: AiLibrarianCardProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleMouseDown = useCallback(() => setIsPressed(true), [])
  const handleMouseUp = useCallback(() => setIsPressed(false), [])
  const handleMouseLeave = useCallback(() => {
    if (isPressed) setIsPressed(false)
  }, [isPressed])

  return (
    <div
      className={`ai-librarian-card ${isPressed ? 'is-pressed' : ''}`}
      role="region"
      aria-label="AI-библиотекарь Букстраж"
    >
      {/* Луна в углу */}
      <div className="ai-card-moon" aria-hidden="true" />

      {/* Фоновые звёзды */}
      <div className="ai-card-stars-bg" aria-hidden="true" />

      {/* Парящий аватар */}
      <div className="ai-card-avatar-wrap">
        <img
          src="/cosmo.webp"
          alt="Букстраж"
          className="ai-card-avatar"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          draggable={false}
        />
      </div>

      {/* Easter egg — звёзды собираются в слово */}

      {/* Заголовок */}
      <h2 className="ai-card-title">Букстраж</h2>

      {/* Подпись */}
      <p className="ai-card-subtitle">
        {isGuest
          ? 'Зарегистрируйся, чтобы получить ИИ-рекомендации книг по твоему вкусу'
          : 'Я проанализирую твои тир-листы и посоветую книги, которые тебе точно понравятся'
        }
      </p>

      {/* Кнопка */}
      <button
        type="button"
        className="ai-card-button"
        onClick={onAskClick}
      >
        <span style={{ fontSize: '1.2em' }}>🔮</span>
        <span>{isGuest ? 'Войти' : 'Спросить'}</span>
      </button>
    </div>
  )
}
