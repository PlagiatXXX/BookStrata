import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Globe,
  LayoutGrid,
  Lock,
  Plus,
  Rows3,
  Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";

import { useUserTemplates, useDeleteTemplate } from "../../hooks/useTemplates";
import { useAuth } from "@/hooks/useAuthContext";
import TemplateCard from "../TemplateCard/TemplateCard";
import { Button } from "../../ui/Button";
import type { Template } from "../../types/templates";
import { DeleteTemplateModal } from "./DeleteTemplateModal";
import { Spinner } from "@/components/Spinner";
import { getPublicTierLists } from "@/lib/api";
import { apiGetLikedTierListIds } from "@/lib/likesApi";
import PublicTierListCards from "./PublicTierListCards";

type SectionKey = "private" | "public" | "favorites" | "archived";
type ViewMode = "masonry" | "compact";

interface TemplateLibraryProps {
  searchQuery?: string;
}

const COVER_HEIGHTS = [320, 420, 360, 500, 390, 460];
const PUBLIC_PAGE_SIZE = 6;

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ searchQuery = "" }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.userId;

  const { data: templates, isLoading, isError, refetch } = useUserTemplates();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("private");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");
  const [publicPage, setPublicPage] = useState(1);
  const deleteIdRef = useRef<string | null>(null);

  const {
    data: publicTierListsData,
    isLoading: isLoadingPublicTierLists,
    isFetching: isFetchingPublicTierLists,
  } = useQuery({
    queryKey: ["publicTierListsSorted", "likes", publicPage],
    queryFn: () => getPublicTierLists(publicPage, PUBLIC_PAGE_SIZE, "likes"),
    staleTime: 30000,
    gcTime: 300000,
    placeholderData: (previousData) => previousData,
  });

  const { data: likedTierListIds } = useQuery({
    queryKey: ["likedTierListIds"],
    queryFn: () => apiGetLikedTierListIds(),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (activeSection === "public") {
      setPublicPage(1);
    }
  }, [searchQuery, activeSection]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (templates || []).forEach((template) => {
      if (template.category?.trim()) set.add(template.category);
    });
    return Array.from(set).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return (templates || []).filter((template) => {
      if (activeSection === "private" && (template.isPublic || template.isArchived)) return false;
      if (activeSection === "favorites" && !template.isFavorite) return false;
      if (activeSection === "archived" && !template.isArchived) return false;
      if (activeSection === "public") return false;

      if (activeCategory !== "all" && template.category !== activeCategory) return false;

      if (!normalizedSearch) return true;
      const title = template.title.toLowerCase();
      const description = (template.description || "").toLowerCase();
      return title.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [templates, activeSection, activeCategory, searchQuery]);

  const likedIdsSet = useMemo(
    () => new Set(likedTierListIds?.likedIds || []),
    [likedTierListIds?.likedIds],
  );

  const publicTierLists = publicTierListsData?.data || [];
  const publicMeta = publicTierListsData?.meta;

  const metaTotalPages = Number(publicMeta?.totalPages);
  const metaCurrentPage = Number(publicMeta?.currentPage);
  const hasMetaPagination =
    Number.isFinite(metaTotalPages) &&
    Number.isFinite(metaCurrentPage) &&
    metaTotalPages > 0 &&
    metaCurrentPage > 0;

  const hasNextPage = hasMetaPagination
    ? publicPage < metaTotalPages
    : publicTierLists.length === PUBLIC_PAGE_SIZE;

  const totalPagesForUi = hasMetaPagination
    ? metaTotalPages
    : hasNextPage
      ? publicPage + 1
      : publicPage;

  useEffect(() => {
    if (
      activeSection === "public" &&
      !isLoadingPublicTierLists &&
      publicPage > 1 &&
      publicTierLists.length === 0
    ) {
      setPublicPage((prev) => Math.max(1, prev - 1));
    }
  }, [activeSection, isLoadingPublicTierLists, publicPage, publicTierLists.length]);

  const pageNumbers = useMemo(() => {
    if (totalPagesForUi <= 7) {
      return Array.from({ length: totalPagesForUi }, (_, index) => index + 1);
    }

    if (publicPage <= 4) {
      return [1, 2, 3, 4, 5, -1, totalPagesForUi];
    }

    if (publicPage >= totalPagesForUi - 3) {
      return [1, -1, totalPagesForUi - 4, totalPagesForUi - 3, totalPagesForUi - 2, totalPagesForUi - 1, totalPagesForUi];
    }

    return [1, -1, publicPage - 1, publicPage, publicPage + 1, -1, totalPagesForUi];
  }, [publicPage, totalPagesForUi]);

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    deleteIdRef.current = template.id;
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    const id = deleteIdRef.current;
    if (!id) return;

    deleteTemplate(id, {
      onSuccess: () => {
        sileo.success({ title: "Шаблон успешно удален" });
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
        deleteIdRef.current = null;
      },
      onError: () => {
        sileo.error({ title: "Не удалось удалить шаблон. Попробуйте снова." });
      },
    });
  };

  const handleEdit = (template: Template) => {
    navigate(`/templates/${template.id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-white/20 bg-black/35 py-8 text-center">
        <p className="mb-4 text-red-300">Ошибка загрузки шаблонов. Пожалуйста, попробуйте снова.</p>
        <Button onClick={() => refetch()} variant="primary">
          Повторить
        </Button>
      </div>
    );
  }

  const hasTemplates = templates && templates.length > 0;

  return (
    <>
      {hasTemplates ? (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-[#0b3f52]/70 bg-[#071f2b]/85 p-4 lg:sticky lg:top-22 lg:h-fit">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Библиотека</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveSection("private")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === "private"
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Lock size={14} /> Личные шаблоны
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("public")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === "public"
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Globe size={14} /> Публичные тир-листы
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("favorites")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === "favorites"
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Star size={14} /> Избранное
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("archived")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === "archived"
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Archive size={14} /> Архив
              </button>
            </div>

            {categories.length > 0 && activeSection !== "public" && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/70">Категории</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      activeCategory === "all"
                        ? "bg-cyan-500/25 text-cyan-100"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    Все
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        activeCategory === category
                          ? "bg-cyan-500/25 text-cyan-100"
                          : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {category.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-cyan-700/50 bg-cyan-900/30 p-3">
              <p className="text-xs text-cyan-100/90">Обновитесь до Pro для неограниченных шаблонов и кастомных тем.</p>
              <Button className="mt-3 w-full" size="sm">
                Обновить
              </Button>
            </div>
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#f3efe6]">
                  {activeSection === "public" ? "Публичные тир-листы" : "Личные шаблоны"}
                </h3>
                <p className="text-sm text-[#b8b1a3]">
                  {activeSection === "public"
                    ? "Подборка публичных рейтингов от сообщества."
                    : "Управляйте личной коллекцией шаблонов для рейтингов."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeSection !== "public" && (
                  <div className="flex rounded-xl border border-cyan-900/80 bg-[#031923]/80 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("masonry")}
                      className={`rounded-lg p-2 ${viewMode === "masonry" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-300"}`}
                      aria-label="Плиточный вид"
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compact")}
                      className={`rounded-lg p-2 ${viewMode === "compact" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-300"}`}
                      aria-label="Компактный вид"
                    >
                      <Rows3 size={16} />
                    </button>
                  </div>
                )}
                <Button onClick={() => navigate("/templates/new")} size="sm">
                  <Plus size={14} />
                  Создать шаблон
                </Button>
              </div>
            </div>

            {activeSection === "public" ? (
              isLoadingPublicTierLists ? (
                <div className="flex items-center justify-center py-12 text-gray-300">
                  <Spinner size="md" className="mr-2" />
                  Загрузка...
                </div>
              ) : publicTierLists.length > 0 ? (
                <>
                  <PublicTierListCards
                    tierLists={publicTierLists}
                    likedIdsSet={likedIdsSet}
                    currentUserId={currentUserId}
                  />

                  <nav
                    className="mt-6 flex items-center justify-center gap-2"
                    aria-label="Пагинация публичных тир-листов"
                  >
                    <button
                      type="button"
                      onClick={() => setPublicPage((prev) => Math.max(1, prev - 1))}
                      disabled={publicPage === 1 || isFetchingPublicTierLists}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
                      aria-label="Предыдущая страница"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {pageNumbers.map((page, index) =>
                      page === -1 ? (
                        <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setPublicPage(page)}
                          disabled={isFetchingPublicTierLists}
                          aria-current={publicPage === page ? "page" : undefined}
                          className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            publicPage === page
                              ? "border-cyan-300/80 bg-cyan-500/25 text-cyan-100"
                              : "border-cyan-800/80 bg-[#08293c] text-cyan-100 hover:bg-[#0b3550]"
                          } disabled:cursor-not-allowed disabled:opacity-45`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() => setPublicPage((prev) => prev + 1)}
                      disabled={!hasNextPage || isFetchingPublicTierLists}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
                      aria-label="Следующая страница"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </nav>
                </>
              ) : (
                <div className="rounded-md border border-white/20 bg-black/30 py-12 text-center">
                  <div className="mb-6">
                    <Globe size={56} className="mx-auto text-[#b8b1a3]" />
                  </div>
                  <h3 className="mb-2 font-display text-xl font-medium text-[#f3efe6]">Нет публичных тир-листов</h3>
                  <p className="mb-6 text-[#b8b1a3]">Попробуйте зайти позже.</p>
                </div>
              )
            ) : filteredTemplates.length > 0 ? (
              viewMode === "masonry" ? (
                <div className="columns-1 gap-4 sm:columns-2 xl:columns-4">
                  {filteredTemplates.map((template, index) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      variant="cover"
                      coverHeight={COVER_HEIGHTS[index % COVER_HEIGHTS.length]}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-md border border-white/20 bg-black/30 py-12 text-center">
                <div className="mb-6">
                  <FileText size={56} className="mx-auto text-[#b8b1a3]" />
                </div>
                <h3 className="mb-2 font-display text-xl font-medium text-[#f3efe6]">Ничего не найдено</h3>
                <p className="mb-6 text-[#b8b1a3]">Попробуйте сменить раздел, категорию или строку поиска.</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-md border border-white/20 bg-black/30 py-12 text-center">
          <div className="mb-6">
            <FileText size={56} className="mx-auto text-[#b8b1a3]" />
          </div>
          <h3 className="mb-2 font-display text-xl font-medium text-[#f3efe6]">Пока нет шаблонов</h3>
          <p className="mb-6 text-[#b8b1a3]">
            Вы еще не создали ни одного шаблона. Начните с создания первого шаблона.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => navigate("/templates/new")}
              variant="primary"
              className="transition-transform hover:scale-105 active:scale-95"
            >
              <Plus size={18} className="mr-2" />
              Создать первый шаблон
            </Button>
            <div className="mt-4 text-sm text-[#b8b1a3]">или</div>
            <Button
              onClick={() => navigate("/templates/all")}
              variant="outline"
              className="transition-transform hover:scale-105 active:scale-95"
            >
              <Compass size={18} className="mr-2" />
              Просмотреть все шаблоны
            </Button>
          </div>
        </div>
      )}

      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
          deleteIdRef.current = null;
        }}
        onConfirm={handleDeleteConfirm}
        templateTitle={templateToDelete?.title || ""}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default TemplateLibrary;
