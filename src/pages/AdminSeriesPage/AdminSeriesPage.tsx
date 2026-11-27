import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, Search, X, ExternalLink } from "lucide-react";
import {
  listAdminSeries,
  createAdminSeries,
  updateAdminSeries,
  deleteAdminSeries,
  type SeriesSummary,
} from "@/lib/seriesApi";
import {
  listAdminAuthors,
  type AdminAuthorListItem,
} from "@/lib/adminAuthorsApi";

interface SeriesFormState {
  name: string;
  description: string;
  coverImageUrl: string;
  authorId: number | null;
  authorName: string;
}

const EMPTY_FORM: SeriesFormState = {
  name: "",
  description: "",
  coverImageUrl: "",
  authorId: null,
  authorName: "",
};

export default function AdminSeriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SeriesSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SeriesFormState>(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authorSuggestions, setAuthorSuggestions] = useState<AdminAuthorListItem[]>([]);
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "series", search],
    queryFn: () => listAdminSeries({ q: search.trim() || undefined, limit: 100 }),
  });

  useEffect(() => {
    if (!modalOpen || !authorDropdownOpen) return;
    const timer = window.setTimeout(() => {
      listAdminAuthors({ q: form.authorName.trim() || undefined, page: 1 })
        .then((res) => setAuthorSuggestions(res.authors.slice(0, 10)))
        .catch(() => setAuthorSuggestions([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [modalOpen, authorDropdownOpen, form.authorName]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "series"] });

  const createMutation = useMutation({
    mutationFn: createAdminSeries,
    onSuccess: () => {
      void invalidate();
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof updateAdminSeries>[1];
    }) => updateAdminSeries(id, payload),
    onSuccess: () => {
      void invalidate();
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSeries,
    onSuccess: () => {
      void invalidate();
      setErrorMessage(null);
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMessage(null);
    setAuthorDropdownOpen(false);
    setModalOpen(true);
  };

  const openEdit = (item: SeriesSummary) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      coverImageUrl: item.coverImageUrl ?? "",
      authorId: item.authorId ?? null,
      authorName: item.author?.name ?? "",
    });
    setErrorMessage(null);
    setAuthorDropdownOpen(false);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setErrorMessage("Укажите название цикла");
      return;
    }

    const payload = {
      name,
      description: form.description.trim() || null,
      coverImageUrl: form.coverImageUrl.trim() || null,
      authorId: form.authorId,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (item: SeriesSummary) => {
    const count = item._count?.books ?? 0;
    if (count > 0) {
      setErrorMessage(
        `Нельзя удалить цикл «${item.name}»: привязано книг — ${count}. Сначала отвяжите книги в редакторе книг.`,
      );
      return;
    }
    if (!window.confirm(`Удалить цикл «${item.name}»?`)) return;
    deleteMutation.mutate(item.id);
  };

  const items = data?.items ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-6 sm:py-10 text-white">
      <div className="max-w-5xl mx-auto px-4">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>В админ-панель</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Циклы книг</h1>
            <p className="text-sm text-gray-400 mt-1">
              Управление циклами и порядком чтения (/series/:slug)
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0f0f1a] hover:bg-amber-300 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Новый цикл
          </button>
        </div>

        {/* Поиск */}
        <div className="relative mb-5">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию цикла…"
            className="w-full rounded-lg border border-gray-700 bg-gray-900/70 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400"
          />
        </div>

        {errorMessage && !modalOpen && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-300 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Автор</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Книг</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Загрузка…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Циклов пока нет
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {item.author?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      <Link
                        to={`/series/${item.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 hover:text-amber-300"
                      >
                        /series/{item.slug}
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {item._count?.books ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
                          aria-label={`Редактировать ${item.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-40 cursor-pointer"
                          aria-label={`Удалить ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка создания / редактирования */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-700 bg-[#151525] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editing ? `Редактировать: ${editing.name}` : "Новый цикл"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">
                  Название цикла *
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Например: Ведьмак"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">
                  Описание (для страницы цикла и SEO)
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Краткое описание мира и порядка чтения…"
                  className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">
                  Обложка цикла (URL, необязательно)
                </span>
                <input
                  value={form.coverImageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, coverImageUrl: e.target.value }))
                  }
                  placeholder="Если пусто — возьмётся обложка первой книги"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>

              {/* Autocomplete автора */}
              <div className="relative">
                <span className="mb-1 block text-sm text-gray-300">
                  Автор (необязательно)
                </span>
                <div className="flex gap-1.5">
                  <input
                    aria-label="Автор цикла"
                    value={form.authorName}
                    onFocus={() => setAuthorDropdownOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setAuthorDropdownOpen(false), 150);
                    }}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setForm((f) => ({
                        ...f,
                        authorName: nextName,
                        authorId: nextName.trim() ? null : null,
                      }));
                      setAuthorDropdownOpen(true);
                    }}
                    placeholder="Начните вводить имя автора…"
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                  {(form.authorId !== null || form.authorName) && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, authorId: null, authorName: "" }))
                      }
                      className="rounded-lg border border-gray-700 px-2.5 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
                      aria-label="Очистить автора"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {authorDropdownOpen && authorSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-[#1a1a2e] shadow-xl">
                    {authorSuggestions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm((f) => ({
                            ...f,
                            authorId: a.id,
                            authorName: a.name,
                          }));
                          setAuthorDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 cursor-pointer flex items-center justify-between"
                      >
                        <span>{a.name}</span>
                        {a.slug && (
                          <span className="text-xs text-gray-400 font-mono">
                            {a.slug}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {editing && (
                <p className="text-xs text-gray-400">
                  Slug <span className="font-mono">/series/{editing.slug}</span>{" "}
                  фиксируется при создании и не меняется при редактировании.
                </p>
              )}

              {errorMessage && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {errorMessage}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0f0f1a] hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Сохранение…" : editing ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
