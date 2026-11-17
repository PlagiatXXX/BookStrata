import { Pencil, Plus } from "lucide-react"
import { GENRE_CATEGORIES, type CategoryId } from "@/data/genre-taxonomy"
import { MAX_GENRE_PREFERENCES } from "@/hooks/useGenrePreferences"

interface ProfileGenresProps {
  genres: CategoryId[]
  isOwner: boolean
  onEdit?: () => void
}

function genreLabel(id: CategoryId): string {
  return GENRE_CATEGORIES.find((category) => category.id === id)?.label ?? id
}

/**
 * Блок «Любимые жанры» обзора (спека §6.5, макет обзор).
 */
export function ProfileGenres({ genres, isOwner, onEdit }: ProfileGenresProps) {
  const hasGenres = genres.length > 0

  return (
    <section aria-label="Любимые жанры" className="card profile-genres-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="h" style={{ margin: 0 }}>Любимые жанры</h2>
        {isOwner && onEdit && hasGenres && (
          <button
            type="button"
            className="btn"
            style={{ padding: "6px 14px", minHeight: 34, fontSize: 13 }}
            onClick={onEdit}
          >
            <Pencil size={13} aria-hidden="true" />
            Изменить
          </button>
        )}
      </div>

      {hasGenres ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {genres.map((genre) => (
            <span
              key={genre}
              className="tag profile-genre-tag"
              style={{ cursor: "pointer" }}
              role={isOwner && onEdit ? "button" : undefined}
              tabIndex={isOwner && onEdit ? 0 : undefined}
              onClick={isOwner && onEdit ? onEdit : undefined}
              onKeyDown={
                isOwner && onEdit
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onEdit()
                      }
                    }
                  : undefined
              }
              title={isOwner && onEdit ? "Нажмите, чтобы изменить любимые жанры" : undefined}
            >
              {genreLabel(genre)}
            </span>
          ))}
        </div>
      ) : isOwner ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="m" style={{ margin: 0, lineHeight: 1.5 }}>
            Выберите до {MAX_GENRE_PREFERENCES} любимых жанров — они появятся в вашем профиле и помогут находить подходящие книги в Book Match.
          </p>
          {onEdit && (
            <div>
              <button
                type="button"
                className="btn"
                style={{
                  borderStyle: "dashed",
                  borderRadius: 99,
                  color: "#fbbf24",
                  borderColor: "rgba(251, 191, 36, 0.4)",
                  padding: "8px 16px",
                  minHeight: 38,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={onEdit}
              >
                <Plus size={14} aria-hidden="true" />
                Добавить любимые жанры
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="m" style={{ margin: 0 }}>
          Пользователь пока не добавил любимые жанры
        </p>
      )}
    </section>
  )
}
