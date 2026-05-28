import { useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { sileo } from "sileo"
import { uploadTierListCover } from "@/lib/tierListApi"
import { TierListCover } from "@/components/DashboardHeroSection/components/TierListCover"

interface TierListCoverEditorProps {
  tierListId: string
  coverImageUrl?: string | null
  title: string
  booksCount: number
  isPro: boolean
  isReadOnly: boolean
  onCoverUpdated: (url: string) => void
}

export function TierListCoverEditor({
  tierListId,
  coverImageUrl,
  title,
  booksCount,
  isPro,
  isReadOnly,
  onCoverUpdated,
}: TierListCoverEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isPro) {
      sileo.action({
        title: "Кастомные обложки только для Pro",
        description: "Оформите подписку, чтобы загружать свои обложки",
        duration: 4000,
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      sileo.error({ title: "Файл слишком большой", description: "Максимум 5 MB" })
      return
    }

    setUploading(true)
    try {
      const result = await uploadTierListCover(tierListId, file)
      onCoverUpdated(result.coverImageUrl)
      sileo.success({ title: "Обложка обновлена" })
    } catch {
      sileo.error({ title: "Ошибка загрузки" })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="mb-6">
      <p className="nb-label-xs mb-2 text-[#64748b] uppercase tracking-wider">
        Обложка тир-листа
      </p>
      <div className="tier-list-cover-editor max-w-52">
        <TierListCover coverImageUrl={coverImageUrl} title={title} booksCount={booksCount} className="tier-list-cover--editor" />
        {!isReadOnly && (
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
                {!isPro && <span className="tier-list-cover-editor__pro-badge">Pro</span>}
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
