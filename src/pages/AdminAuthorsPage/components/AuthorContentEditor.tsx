import { useState } from "react"
import { Plus, Save, Trash2 } from "lucide-react"
import { uploadAuthorHero } from "@/lib/adminAuthorsApi"
import type { AdminAuthorContent, AuthorContentInput } from "@/lib/adminAuthorsApi"
import { AuthorAiPrompt } from "./AuthorAiPrompt"
import type { AuthorAiFill } from "./authorAi"

/** Лимиты секций — зеркалит authorContentInputSchema на бэке (Zod max). */
const LIMITS = {
  stats: 8,
  showcase: 4,
  adaptations: 20,
  pressQuotes: 20,
} as const

const KIND_LABELS: Record<"film" | "theatre" | "tv", string> = {
  film: "Фильм",
  theatre: "Театр",
  tv: "ТВ",
}

type StatRow = { value: string; label: string }
type ShowcaseRow = { bookId: string; pullQuote: string }
type AdaptationRow = {
  kind: "film" | "theatre" | "tv"
  title: string
  meta: string
  description: string
  url: string
}
type PressRow = { quote: string; source: string; sourceRole: string }

/** Контролируемое состояние формы (паттерн админ-форм проекта —
 *  без react-hook-form, см. CelebrityFormModal). */
interface FormState {
  heroImageUrl: string
  badge: string
  motto: string
  manifestoQuote: string
  manifestoAuthor: string
  manifestoRole: string
  aboutText: string
  stats: StatRow[]
  showcase: ShowcaseRow[]
  adaptations: AdaptationRow[]
  pressQuotes: PressRow[]
}

const orEmpty = (v: string | null) => v ?? ""

/** AdminAuthorContent (null-поля) → строковые значения формы. */
function contentToForm(c: AdminAuthorContent): FormState {
  return {
    heroImageUrl: orEmpty(c.heroImageUrl),
    badge: orEmpty(c.badge),
    motto: orEmpty(c.motto),
    manifestoQuote: orEmpty(c.manifestoQuote),
    manifestoAuthor: orEmpty(c.manifestoAuthor),
    manifestoRole: orEmpty(c.manifestoRole),
    aboutText: orEmpty(c.aboutText),
    stats: c.stats.map((s) => ({ value: s.value, label: s.label })),
    showcase: c.showcase.map((s) => ({
      bookId: String(s.bookId),
      pullQuote: orEmpty(s.pullQuote),
    })),
    adaptations: c.adaptations.map((a) => ({
      kind: a.kind,
      title: a.title,
      meta: orEmpty(a.meta),
      description: orEmpty(a.description),
      url: orEmpty(a.url),
    })),
    pressQuotes: c.pressQuotes.map((p) => ({
      quote: p.quote,
      source: p.source,
      sourceRole: orEmpty(p.sourceRole),
    })),
  }
}

/** Пустая строка (после trim) → null при отправке. */
const nullify = (v: string) => (v.trim() === "" ? null : v)

/** Форма → payload: пустые строки → null, списки — как есть,
 *  bookId селекта (строка) → число. */
function formToPayload(f: FormState): AuthorContentInput {
  return {
    heroImageUrl: nullify(f.heroImageUrl),
    badge: nullify(f.badge),
    motto: nullify(f.motto),
    manifestoQuote: nullify(f.manifestoQuote),
    manifestoAuthor: nullify(f.manifestoAuthor),
    manifestoRole: nullify(f.manifestoRole),
    aboutText: nullify(f.aboutText),
    stats: f.stats.map((s) => ({ value: s.value, label: s.label })),
    showcase: f.showcase
      .filter((s) => s.bookId !== "")
      .map((s) => ({ bookId: Number(s.bookId), pullQuote: nullify(s.pullQuote) })),
    adaptations: f.adaptations.map((a) => ({
      kind: a.kind,
      title: a.title,
      meta: nullify(a.meta),
      description: nullify(a.description),
      url: nullify(a.url),
    })),
    pressQuotes: f.pressQuotes.map((p) => ({
      quote: p.quote,
      source: p.source,
      sourceRole: nullify(p.sourceRole),
    })),
  }
}

const inputClass =
  "w-full bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
const labelClass = "block text-sm text-gray-400 mb-1.5"
const sectionClass = "rounded-xl border border-gray-800 bg-white/5 p-4"
const sectionTitleClass = "text-sm font-semibold text-white mb-3"
const addBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 border border-gray-700 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"

interface AuthorContentEditorProps {
  /** Имя автора — подставляется в AI-промпт. */
  authorName: string
  /** Контент автора — инициализирует состояние формы при монтаже
   *  (внешний ключ key={selectedId} пересоздаёт компонент при смене автора). */
  content: AdminAuthorContent
  books: { id: number; title: string }[]
  booksLoading: boolean
  savePending: boolean
  onSave: (payload: AuthorContentInput) => void
}

export function AuthorContentEditor({
  authorName,
  content,
  books,
  booksLoading,
  savePending,
  onSave,
}: AuthorContentEditorProps) {
  const [form, setForm] = useState<FormState>(() => contentToForm(content))
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null)
  // Источники статистики из ответа ИИ — для ручной сверки до сохранения
  const [statSources, setStatSources] = useState<string[]>([])

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // можно перезагружать тот же файл
    if (!file) return
    setHeroUploading(true)
    setHeroUploadError(null)
    try {
      const { heroImageUrl } = await uploadAuthorHero(file)
      setForm((f) => ({ ...f, heroImageUrl }))
    } catch (err) {
      setHeroUploadError(
        `Не удалось загрузить фото${err instanceof Error && err.message ? `: ${err.message}` : ""}`,
      )
    } finally {
      setHeroUploading(false)
    }
  }

  const setField =
    (key: keyof Pick<
      FormState,
      | "heroImageUrl"
      | "badge"
      | "motto"
      | "manifestoQuote"
      | "manifestoAuthor"
      | "manifestoRole"
      | "aboutText"
    >) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const appendRow = <K extends "stats" | "showcase" | "adaptations" | "pressQuotes">(
    key: K,
    row: FormState[K][number],
  ) => setForm((f) => ({ ...f, [key]: [...f[key], row] }))

  const removeRow = (
    key: "stats" | "showcase" | "adaptations" | "pressQuotes",
    index: number,
  ) => setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }))

  const updateRow = <K extends "stats" | "showcase" | "adaptations" | "pressQuotes">(
    key: K,
    index: number,
    patch: Partial<FormState[K][number]>,
  ) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formToPayload(form))
    setStatSources([]) // источники сверены — убираем
  }

  /** Есть ли заполненные текстовые поля — тогда AI-заливка спрашивает подтверждение. */
  const hasContent = Boolean(
    form.badge ||
      form.motto ||
      form.manifestoQuote ||
      form.manifestoAuthor ||
      form.manifestoRole ||
      form.aboutText ||
      form.stats.length > 0,
  )

  /** Заливка ответа ИИ в текстовые поля и статистику (heroImageUrl/showcase и т.д. не трогаем). */
  const handleAiFill = (fill: AuthorAiFill) => {
    setForm((f) => ({
      ...f,
      badge: fill.badge,
      motto: fill.motto,
      manifestoQuote: fill.manifestoQuote,
      manifestoAuthor: fill.manifestoAuthor,
      manifestoRole: fill.manifestoRole,
      aboutText: fill.aboutText,
      stats: fill.stats,
    }))
    setStatSources(fill.statSources)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={savePending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[--accent-main]/20 text-[--accent-main] border border-[--accent-main]/40 hover:bg-[--accent-main]/30 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save size={15} />
          {savePending ? "Сохранение..." : "Сохранить"}
        </button>
      </div>

      {/* 0. AI-промпт — заполнение ручных полей через ИИ */}
      <AuthorAiPrompt
        authorName={authorName}
        hasContent={hasContent}
        onFill={handleAiFill}
      />

      {/* 1. Hero */}
      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Герой</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="heroImageUrl" className={labelClass}>
              URL изображения героя
            </label>
            <div className="flex gap-2">
              <input
                id="heroImageUrl"
                type="text"
                value={form.heroImageUrl}
                onChange={setField("heroImageUrl")}
                placeholder="https://..."
                className={inputClass}
              />
              <label
                className={`${addBtnClass} shrink-0`}
                title="Загрузить фото автора"
              >
                {heroUploading ? "Загрузка..." : "Загрузить фото"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={heroUploading}
                  onChange={handleHeroUpload}
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Портрет 3:4 — ~1200×1600 px (мин. 800×1067), до 300 КБ,
              WebP/JPEG; лицо в верхней трети, тёмный фон
            </p>
            {heroUploadError && (
              <p className="mt-1 text-xs text-red-400">{heroUploadError}</p>
            )}
          </div>
          <div>
            <label htmlFor="badge" className={labelClass}>
              Бейдж
            </label>
            <input
              id="badge"
              type="text"
              value={form.badge}
              onChange={setField("badge")}
              placeholder="Например: Классик"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="motto" className={labelClass}>
              Девиз
            </label>
            <input
              id="motto"
              type="text"
              value={form.motto}
              onChange={setField("motto")}
              placeholder="Короткий девиз"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* 2. Манифест */}
      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Манифест</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="manifestoQuote" className={labelClass}>
              Цитата манифеста
            </label>
            <textarea
              id="manifestoQuote"
              value={form.manifestoQuote}
              onChange={setField("manifestoQuote")}
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="manifestoAuthor" className={labelClass}>
              Автор цитаты
            </label>
            <input
              id="manifestoAuthor"
              type="text"
              value={form.manifestoAuthor}
              onChange={setField("manifestoAuthor")}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="manifestoRole" className={labelClass}>
              Роль автора
            </label>
            <input
              id="manifestoRole"
              type="text"
              value={form.manifestoRole}
              onChange={setField("manifestoRole")}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="aboutText" className={labelClass}>
              Описание автора
            </label>
            <textarea
              id="aboutText"
              value={form.aboutText}
              onChange={setField("aboutText")}
              rows={4}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* 3. Статистика */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${sectionTitleClass} mb-0`}>
            Статистика ({form.stats.length}/{LIMITS.stats})
          </h3>
          <button
            type="button"
            onClick={() => appendRow("stats", { value: "", label: "" })}
            disabled={form.stats.length >= LIMITS.stats}
            className={addBtnClass}
          >
            <Plus size={12} />
            Добавить статистику
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Что добавить: кол-во написанных книг, романов с экранизациями,
          рекорды («№1 в New York Times»), тиражи, премии. Цифры — только
          достоверные.
        </p>
        <div className="flex flex-col gap-2">
          {form.stats.map((row, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-32">
                <label htmlFor={`stats-${i}-value`} className={labelClass}>
                  Значение
                </label>
                <input
                  id={`stats-${i}-value`}
                  type="text"
                  value={row.value}
                  onChange={(e) => updateRow("stats", i, { value: e.target.value })}
                  placeholder="50+"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`stats-${i}-label`} className={labelClass}>
                  Подпись
                </label>
                <input
                  id={`stats-${i}-label`}
                  type="text"
                  value={row.label}
                  onChange={(e) => updateRow("stats", i, { label: e.target.value })}
                  placeholder="Книг"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow("stats", i)}
                className="mb-2"
                aria-label="Удалить статистику"
              >
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          ))}
          {form.stats.length === 0 && (
            <p className="text-xs text-gray-500">Нет строк</p>
          )}
        </div>
        {statSources.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
            <p className="text-xs font-semibold text-amber-400 mb-1">
              Источники из ответа ИИ
            </p>
            <ul className="flex flex-col gap-0.5 text-xs text-gray-400">
              {statSources.map((source, i) => (
                <li key={i}>
                  <span className="text-gray-500">
                    {form.stats[i]?.value ?? "?"} {form.stats[i]?.label ?? ""} —
                  </span>{" "}
                  {source || "источник не указан, проверьте вручную"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 4. Избранные книги (showcase) */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${sectionTitleClass} mb-0`}>
            Избранные книги ({form.showcase.length}/{LIMITS.showcase})
          </h3>
          <button
            type="button"
            onClick={() => appendRow("showcase", { bookId: "", pullQuote: "" })}
            disabled={form.showcase.length >= LIMITS.showcase}
            className={addBtnClass}
          >
            <Plus size={12} />
            Добавить книгу
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {form.showcase.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-800 bg-white/5 p-3"
            >
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={`showcase-${i}-book`} className={labelClass}>
                    Книга
                  </label>
                  <select
                    id={`showcase-${i}-book`}
                    value={row.bookId}
                    onChange={(e) =>
                      updateRow("showcase", i, { bookId: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">— выберите книгу —</option>
                    {books.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  {booksLoading && (
                    <span className="text-[11px] text-gray-500">
                      Загрузка книг...
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow("showcase", i)}
                  className="mb-2"
                  aria-label="Удалить книгу"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
              <div className="mt-2">
                <label htmlFor={`showcase-${i}-quote`} className={labelClass}>
                  Цитата к книге
                </label>
                <input
                  id={`showcase-${i}-quote`}
                  type="text"
                  value={row.pullQuote}
                  onChange={(e) =>
                    updateRow("showcase", i, { pullQuote: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          ))}
          {form.showcase.length === 0 && (
            <p className="text-xs text-gray-500">Книг нет</p>
          )}
        </div>
      </section>

      {/* 5. Экранизации */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${sectionTitleClass} mb-0`}>
            Экранизации ({form.adaptations.length}/{LIMITS.adaptations})
          </h3>
          <button
            type="button"
            onClick={() =>
              appendRow("adaptations", {
                kind: "film",
                title: "",
                meta: "",
                description: "",
                url: "",
              })
            }
            disabled={form.adaptations.length >= LIMITS.adaptations}
            className={addBtnClass}
          >
            <Plus size={12} />
            Добавить экранизацию
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {form.adaptations.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-800 bg-white/5 p-3"
            >
              <div className="flex items-end gap-2">
                <div className="w-32">
                  <label htmlFor={`adaptations-${i}-kind`} className={labelClass}>
                    Тип
                  </label>
                  <select
                    id={`adaptations-${i}-kind`}
                    value={row.kind}
                    onChange={(e) =>
                      updateRow("adaptations", i, {
                        kind: e.target.value as AdaptationRow["kind"],
                      })
                    }
                    className={inputClass}
                  >
                    {(["film", "theatre", "tv"] as const).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor={`adaptations-${i}-title`} className={labelClass}>
                    Название
                  </label>
                  <input
                    id={`adaptations-${i}-title`}
                    type="text"
                    value={row.title}
                    onChange={(e) =>
                      updateRow("adaptations", i, { title: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="w-36">
                  <label htmlFor={`adaptations-${i}-meta`} className={labelClass}>
                    Год / детали
                  </label>
                  <input
                    id={`adaptations-${i}-meta`}
                    type="text"
                    value={row.meta}
                    onChange={(e) =>
                      updateRow("adaptations", i, { meta: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow("adaptations", i)}
                  className="mb-2"
                  aria-label="Удалить экранизацию"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`adaptations-${i}-description`}
                    className={labelClass}
                  >
                    Описание
                  </label>
                  <input
                    id={`adaptations-${i}-description`}
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      updateRow("adaptations", i, { description: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`adaptations-${i}-url`} className={labelClass}>
                    Ссылка
                  </label>
                  <input
                    id={`adaptations-${i}-url`}
                    type="text"
                    value={row.url}
                    onChange={(e) =>
                      updateRow("adaptations", i, { url: e.target.value })
                    }
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
          {form.adaptations.length === 0 && (
            <p className="text-xs text-gray-500">Нет экранизаций</p>
          )}
        </div>
      </section>

      {/* 6. Пресса */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${sectionTitleClass} mb-0`}>
            Пресса ({form.pressQuotes.length}/{LIMITS.pressQuotes})
          </h3>
          <button
            type="button"
            onClick={() =>
              appendRow("pressQuotes", {
                quote: "",
                source: "",
                sourceRole: "",
              })
            }
            disabled={form.pressQuotes.length >= LIMITS.pressQuotes}
            className={addBtnClass}
          >
            <Plus size={12} />
            Добавить цитату прессы
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {form.pressQuotes.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-800 bg-white/5 p-3"
            >
              <div>
                <label htmlFor={`pressQuotes-${i}-quote`} className={labelClass}>
                  Цитата
                </label>
                <textarea
                  id={`pressQuotes-${i}-quote`}
                  value={row.quote}
                  onChange={(e) =>
                    updateRow("pressQuotes", i, { quote: e.target.value })
                  }
                  rows={2}
                  className={inputClass}
                />
              </div>
              <div className="mt-2 flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={`pressQuotes-${i}-source`} className={labelClass}>
                    Издание
                  </label>
                  <input
                    id={`pressQuotes-${i}-source`}
                    type="text"
                    value={row.source}
                    onChange={(e) =>
                      updateRow("pressQuotes", i, { source: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor={`pressQuotes-${i}-sourceRole`}
                    className={labelClass}
                  >
                    Автор / роль
                  </label>
                  <input
                    id={`pressQuotes-${i}-sourceRole`}
                    type="text"
                    value={row.sourceRole}
                    onChange={(e) =>
                      updateRow("pressQuotes", i, { sourceRole: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow("pressQuotes", i)}
                  className="mb-2"
                  aria-label="Удалить цитату прессы"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
          {form.pressQuotes.length === 0 && (
            <p className="text-xs text-gray-500">Нет цитат</p>
          )}
        </div>
      </section>
    </form>
  )
}
