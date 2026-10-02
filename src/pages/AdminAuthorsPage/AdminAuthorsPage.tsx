import { useState } from "react"
import { ArrowLeft, Search } from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout"
import { useDebounce } from "@/hooks/useDebounce"
import { sileo } from "sileo"
import type { AuthorContentInput } from "@/lib/adminAuthorsApi"
import {
  useAdminAuthorBooks,
  useAdminAuthorContent,
  useAdminAuthorList,
  useSaveAuthorContent,
} from "./hooks/useAdminAuthors"
import { AuthorContentEditor } from "./components/AuthorContentEditor"

const inputClass =
  "w-full bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"

export default function AdminAuthorsPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [status, setStatus] = useState<
    { type: "success"; text: string } | { type: "error"; text: string } | null
  >(null)

  const authorsQuery = useAdminAuthorList(debouncedSearch)
  const contentQuery = useAdminAuthorContent(selectedId)
  const booksQuery = useAdminAuthorBooks(selectedId)
  const saveMutation = useSaveAuthorContent(selectedId)

  const handleSave = (payload: AuthorContentInput) => {
    if (selectedId === null) return
    saveMutation.mutate(payload, {
      onSuccess: () => {
        setStatus({ type: "success", text: "Контент автора сохранён" })
        sileo.success({ title: "Контент автора сохранён", duration: 3000 })
      },
      onError: (err: Error) => {
        setStatus({
          type: "error",
          text: err.message || "Не удалось сохранить контент",
        })
        sileo.error({
          title: "Ошибка сохранения",
          description: err.message,
          duration: 5000,
        })
      },
    })
  }

  const authors = authorsQuery.data ?? []
  const books = booksQuery.data?.items ?? []
  const selectedAuthor = authors.find((a) => a.id === selectedId)

  return (
    <DashboardLayout showTemplatesNav={false} showSearch={false} activeItem="Авторы">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Назад</span>
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Контент авторов</h1>
          <p className="text-sm text-gray-400">
            Ручной контент страницы автора: герой, манифест, статистика,
            избранные книги, экранизации, пресса
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Левая колонка — поиск и список авторов */}
          <div>
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder="Поиск автора..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9`}
                aria-label="Поиск автора"
              />
            </div>

            {authorsQuery.isLoading && (
              <div className="text-sm text-gray-500 py-4">Загрузка...</div>
            )}

            {authorsQuery.error && (
              <div role="alert" className="text-sm text-red-400 py-4">
                Не удалось загрузить авторов:{" "}
                {(authorsQuery.error as Error).message}
              </div>
            )}

            {!authorsQuery.isLoading &&
              !authorsQuery.error &&
              authors.length === 0 && (
                <div className="text-sm text-gray-500 py-4">
                  {debouncedSearch.length === 1
                    ? "Введите 2 и более символа для поиска"
                    : "Авторы не найдены"}
                </div>
              )}

            <div className="flex flex-col gap-2">
              {authors.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  data-testid={`author-item-${a.id}`}
                  onClick={() => {
                    setSelectedId(a.id)
                    setStatus(null)
                  }}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                    selectedId === a.id
                      ? "border-[--accent-main]/60 bg-white/10"
                      : "border-gray-800 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="block text-sm font-medium text-white">
                    {a.name}
                  </span>
                  {a.slug && (
                    <span className="block text-xs text-gray-500">{a.slug}</span>
                  )}
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {a.statsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        Статистика: {a.statsCount}
                      </span>
                    )}
                    {a.showcaseCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Showcase: {a.showcaseCount}
                      </span>
                    )}
                    {a.adaptationsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Экранизации: {a.adaptationsCount}
                      </span>
                    )}
                    {a.pressQuotesCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-violet-500/10 text-violet-400 border border-violet-500/30">
                        Пресса: {a.pressQuotesCount}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Правая колонка — редактор */}
          <div>
            {selectedId === null ? (
              <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center text-sm text-gray-500">
                Выберите автора слева, чтобы отредактировать контент его
                страницы
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedAuthor?.name ?? `Автор #${selectedId}`}
                  </h2>
                </div>

                {status && (
                  <div
                    role={status.type === "error" ? "alert" : "status"}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      status.type === "error"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {status.text}
                  </div>
                )}

                {contentQuery.isLoading && (
                  <div className="text-sm text-gray-500">
                    Загрузка контента...
                  </div>
                )}

                {contentQuery.error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                  >
                    Не удалось загрузить контент:{" "}
                    {(contentQuery.error as Error).message}
                  </div>
                )}

                {contentQuery.data && (
                  <AuthorContentEditor
                    key={selectedId}
                    authorName={selectedAuthor?.name ?? ""}
                    content={contentQuery.data}
                    books={books}
                    booksLoading={booksQuery.isLoading}
                    savePending={saveMutation.isPending}
                    onSave={handleSave}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
