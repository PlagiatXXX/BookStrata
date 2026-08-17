// src/pages/AdminBooksPage/AdminBooksPage.tsx
// Админка каталога книг (Фаза 7, seobook.md): таблица с поиском и
// фильтрами (status/genre/дубли) и аналитикой (просмотры из AnalyticsEvent),
// редактор книги (поля, slug с историей, contextChain, публикация через
// инвариант полноты, обогащение Google Books), ручной merge дублей,
// модерация комментариев.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, MessageSquare, Pencil } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { listAdminBooks } from "@/lib/adminBooksApi";
import { useAdminBooks } from "./hooks/useAdminBooks";
import { BookEditModal } from "./components/BookEditModal";
import { MergeModal } from "./components/MergeModal";
import { CommentsModal } from "./components/CommentsModal";

export default function AdminBooksPage() {
  const navigate = useNavigate();
  const h = useAdminBooks();

  const [mergeQuery, setMergeQuery] = useState("");

  const mergeCandidatesQuery = useQuery({
    queryKey: ["admin-books-merge", mergeQuery],
    queryFn: () => listAdminBooks({ q: mergeQuery || undefined, limit: 20 }),
    enabled: h.mergeBook !== null && mergeQuery.trim().length >= 2,
    placeholderData: (prev) => prev,
  });

  const handlePublish = () => {
    if (h.editingId === null) return;
    h.publishMutation.mutate(h.editingId);
  };

  const editingBook = h.detail;
  const totalPages = Math.max(1, Math.ceil(h.total / h.pageSize));

  return (
    <DashboardLayout showTemplatesNav={false} showSearch={false} activeItem="Книги">
      <div className="min-h-screen p-6 md:p-8">
        <button
          onClick={() => navigate("/admin")}
          className="mb-4 flex cursor-pointer items-center gap-2 text-[var(--ink-1)] transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Назад в админку</span>
        </button>

        <div className="mb-4">
          <h1 className="text-2xl font-extrabold text-[var(--ink-0)]">Каталог книг</h1>
          <p className="mt-1 text-sm text-[var(--ink-1)]">
            {h.total} книг · публикация — только при полном наборе обязательных полей
          </p>
        </div>

        {/* Фильтры */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-1)] px-3 py-2">
            <Search size={15} className="shrink-0 text-[var(--ink-2)]" />
            <input
              value={h.q}
              onChange={(e) => { h.setQ(e.target.value); h.setOffset(0); }}
              placeholder="Поиск по названию или автору…"
              className="w-full bg-transparent text-sm text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-2)]"
            />
          </div>
          <select
            value={h.status}
            onChange={(e) => { h.setStatus(e.target.value as typeof h.status); h.setOffset(0); }}
            aria-label="Фильтр по статусу"
            className="rounded-lg border border-[var(--ink-3)] bg-[var(--bg-1)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="published">Опубликованные</option>
            <option value="draft">Черновики</option>
          </select>
          <select
            value={h.genre}
            onChange={(e) => { h.setGenre(e.target.value); h.setOffset(0); }}
            aria-label="Фильтр по жанру"
            className="max-w-44 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-1)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none"
          >
            <option value="">Все жанры</option>
            {h.genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={h.sort}
            onChange={(e) => { h.setSort(e.target.value); h.setOffset(0); }}
            aria-label="Сортировка"
            className="rounded-lg border border-[var(--ink-3)] bg-[var(--bg-1)] px-3 py-2 text-sm text-[var(--ink-0)] outline-none"
          >
            <option value="updatedAt">По обновлению</option>
            <option value="rating">По рейтингу</option>
            <option value="likesCount">По лайкам</option>
            <option value="title">По названию</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--ink-3)] bg-[var(--bg-1)] px-3 py-2 text-sm text-[var(--ink-0)]">
            <input
              type="checkbox"
              checked={h.duplicatesOnly}
              onChange={(e) => { h.setDuplicatesOnly(e.target.checked); h.setOffset(0); }}
              className="accent-[var(--accent-main)]"
            />
            Дубли (merged)
          </label>
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto rounded-xl border border-[var(--ink-3)] bg-[var(--bg-1)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ink-3)] text-xs uppercase tracking-wide text-[var(--ink-2)]">
                <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">Книга</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">Статус</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">Рейт.</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">Лайки</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">Комм.</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">Обновл.</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">Просм.</th>
                <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">Действ.</th>
              </tr>
            </thead>
            <tbody>
              {h.loading ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-[var(--ink-2)]">Загрузка…</td></tr>
              ) : h.items.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-[var(--ink-2)]">Ничего не найдено</td></tr>
              ) : (
                h.items.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--ink-3)]/50 last:border-0 hover:bg-[var(--ink-3)]/30">
                    <td className="px-1.5 py-1.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => h.setEditingId(b.id)}
                          title="Редактировать книгу"
                          aria-label={`Редактировать обложку: ${b.title}`}
                          className="shrink-0 cursor-pointer overflow-hidden rounded transition-opacity hover:opacity-75"
                        >
                          <img
                            src={b.coverImageUrl || undefined}
                            alt=""
                            className="h-14 w-10 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => h.setEditingId(b.id)}
                            title="Редактировать книгу"
                            aria-label={`Редактировать название: ${b.title}`}
                            className="block w-full cursor-pointer truncate text-left font-medium text-[var(--ink-0)] transition-colors hover:text-white"
                          >
                            {b.mergedIntoId ? <span className="mr-1 text-xs text-red-400">[дубль]</span> : null}
                            {b.title}
                          </button>
                          <p className="truncate text-xs text-[var(--ink-2)]">
                            {b.author ?? "—"}
                            {b.genre ? ` · ${b.genre}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <span
                        className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                          b.status === "published"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {b.status === "published" ? "Опубл." : "Черн."}
                      </span>
                    </td>
                    <td className="px-1.5 py-1.5 text-[var(--ink-0)]">{b.rating ?? "—"}</td>
                    <td className="px-1.5 py-1.5 text-[var(--ink-0)]">{b.likesCount}</td>
                    <td className="px-1.5 py-1.5 text-[var(--ink-0)]">{b._count.comments}</td>
                    <td className="px-1.5 py-1.5 text-xs text-[var(--ink-2)]">
                      {new Date(b.updatedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-medium text-[var(--accent-main)]">{b.views}</td>
                    <td className="px-1.5 py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => h.setEditingId(b.id)}
                          title="Редактировать"
                          aria-label="Редактировать"
                          className="rounded-lg border border-[var(--ink-3)] px-1.5 py-1 text-[var(--ink-0)] hover:bg-[var(--ink-3)] cursor-pointer"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => h.setCommentsBook({ id: b.id, title: b.title })}
                          className="flex items-center gap-1 rounded-lg border border-[var(--ink-3)] px-1.5 py-1 text-[var(--ink-0)] hover:bg-[var(--ink-3)] cursor-pointer"
                        >
                          <MessageSquare size={12} /> {b._count.comments}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--ink-1)]">
          <span>
            {h.total > 0 ? `${h.offset + 1}–${Math.min(h.offset + h.pageSize, h.total)} из ${h.total}` : "0 книг"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => h.setOffset((o) => Math.max(0, o - h.pageSize))}
              disabled={h.offset === 0}
              className="rounded-lg border border-[var(--ink-3)] px-3 py-1.5 text-xs hover:bg-[var(--ink-3)] disabled:opacity-40 cursor-pointer"
            >
              ← Назад
            </button>
            <span className="px-2 py-1.5 text-xs">{h.offset / h.pageSize + 1} / {totalPages}</span>
            <button
              onClick={() => h.setOffset((o) => o + h.pageSize)}
              disabled={h.offset + h.pageSize >= h.total}
              className="rounded-lg border border-[var(--ink-3)] px-3 py-1.5 text-xs hover:bg-[var(--ink-3)] disabled:opacity-40 cursor-pointer"
            >
              Вперёд →
            </button>
          </div>
        </div>

        {/* Модалка редактирования */}
        {h.editingId !== null && editingBook && (
          <BookEditModal
            key={editingBook.id}
            book={editingBook}
            saving={h.saveMutation.isPending}
            publishing={h.publishMutation.isPending}
            unpublishing={h.unpublishMutation.isPending}
            enriching={h.enrichMutation.isPending}
            enrichResult={h.enrichMutation.data?.updated ?? null}
            onSave={(patch) => h.saveMutation.mutate({ id: editingBook.id, patch })}
            onPublish={handlePublish}
            onUnpublish={() => h.unpublishMutation.mutate(editingBook.id)}
            onEnrich={() => h.enrichMutation.mutate(editingBook.id)}
            onMerge={() => {
              setMergeQuery("");
              h.setMergeBook({ id: editingBook.id, title: editingBook.title });
            }}
            onClose={() => h.setEditingId(null)}
          />
        )}

        {/* Модалка merge */}
        {h.mergeBook && (
          <MergeModal
            book={h.mergeBook}
            searching={mergeCandidatesQuery.isFetching}
            candidates={mergeCandidatesQuery.data?.items ?? []}
            merging={h.mergeMutation.isPending}
            onSearch={setMergeQuery}
            onMerge={(targetId) => h.mergeMutation.mutate({ dupId: h.mergeBook!.id, targetId })}
            onClose={() => h.setMergeBook(null)}
          />
        )}

        {/* Модалка комментариев */}
        {h.commentsBook && (
          <CommentsModal
            book={h.commentsBook}
            comments={h.comments}
            loading={h.commentsLoading}
            onUpdate={(id, content) => h.updateCommentMutation.mutate({ id, content })}
            onDelete={(id) => h.deleteCommentMutation.mutate(id)}
            onClose={() => h.commentsBook && h.setCommentsBook(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}