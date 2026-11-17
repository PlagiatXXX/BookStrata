import { Pencil } from "lucide-react"
import { GENRE_CATEGORIES, type CategoryId } from "@/data/genre-taxonomy"

interface ProfileGenresProps {
  genres: CategoryId[]
  isOwner: boolean
  /** Кнопка «Изменить» у владельца — переход к вкладке «Настройки», блок жанров. */
  onEdit?: () => void
}

/** Label жанра из канонической таксономии. */
function genreLabel(id: CategoryId): string {
  return GENRE_CATEGORIES.find((category) => category.id === id)?.label ?? id
}

/**
 * Блок «Любимые жанры» обзора (спека §6.5): теги без счётчика.
 * У владельца — кнопка «Изменить». Пустой блок не рендерится.
 */
export function ProfileGenres({ genres, isOwner, onEdit }: ProfileGenresProps) {
  if (genres.length === 0) return null

  return (
    <section aria-label="Любимые жанры" className="profile-section">
      <div className="profile-section__header">
        <span className="profile-pill-label">Любимые жанры</span>
        {isOwner && onEdit && (
          <button
            type="button"
            className="profile-section__action"
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden="true" />
            Изменить
          </button>
        )}
      </div>
      <ul className="profile-genres__tags">
        {genres.map((genre) => (
          <li key={genre} className="profile-genre-tag">
            {genreLabel(genre)}
          </li>
        ))}
      </ul>
    </section>
  )
}
