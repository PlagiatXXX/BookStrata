import { useRef, useState } from "react"
import { ImagePlus } from "lucide-react"
import { sileo } from "sileo"
import { uploadTierListCover } from "@/lib/tierListApi"
import { TierListCover } from "@/components/DashboardHeroSection/components/TierListCover"

// NSFW-проверка обложки выполняется на сервере при загрузке.
interface TierListCoverEditorProps {
  tierListId: string
  coverImageUrl?: string | null
  title: string
  booksCount: number
  isReadOnly: boolean
  onCoverUpdated: (url: string) => void
  ownerUserId?: number
  currentUserId?: number | null
}

export function TierListCoverEditor({
  tierListId,
  coverImageUrl,
  title,
  booksCount,
  isReadOnly,
  onCoverUpdated,
  ownerUserId,
  currentUserId,
}: TierListCoverEditorProps) {
  // Двойная проверка: isReadOnly + isOwner (защита от race condition)
  const isOwner = ownerUserId !== undefined && currentUserId !== undefined && ownerUserId === currentUserId
  const canEdit = !isReadOnly && isOwner
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const doUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await uploadTierListCover(tierListId, file)
      onCoverUpdated(result.coverImageUrl)
      sileo.success({ title: "Обложка обновлена" })
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Ошибка загрузки. Изображение не прошло проверку или превышает лимит."
      sileo.error({ title: message })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      sileo.error({ title: "Файл слишком большой", description: "Максимум 5 MB" })
      return
    }

    await doUpload(file)
  }

  return (
    <div>
      <p className="nb-label-xs mb-2 text-(--theme-text-muted) uppercase tracking-wider">
        Обложка тир-листа
      </p>
      <div className="tier-list-cover-editor max-w-52">
        <TierListCover coverImageUrl={coverImageUrl} title={title} booksCount={booksCount} className="tier-list-cover--editor" />
        {canEdit && (
          <>
            {coverImageUrl ? (
              <div className="tier-list-cover-editor__actions">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="tier-list-cover-editor__btn"
                  type="button"
                  disabled={uploading}
                >
                  <ImagePlus size={14} />
                  {uploading ? "Загрузка..." : "Изменить обложку"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="tier-list-cover-editor__btn tier-list-cover-editor__btn--add"
                type="button"
                disabled={uploading}
              >
                <ImagePlus size={14} />
                {uploading ? "Загрузка..." : "Добавить обложку"}

              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </>
        )}
      </div>
    </div>
  )
}