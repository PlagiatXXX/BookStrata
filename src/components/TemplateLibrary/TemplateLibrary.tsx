import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  LayoutGrid,
  Lock,
  Plus,
  Rows3,
  Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { sileo } from "sileo";

import { useUserTemplates, useDeleteTemplate } from "../../hooks/useTemplates";
import { useAuth } from "@/hooks/useAuthContext";
import TemplateCard from "../TemplateCard/TemplateCard";
import { Button } from "../../ui/Button";
import type { Template } from "../../types/templates";
import { DeleteTemplateModal } from "./DeleteTemplateModal";
import { Spinner } from "@/components/Spinner";
import { getPublicTierLists } from "@/lib/api";
import type { PaginatedTierListsResponse } from "@/lib/api";
import { apiGetLikedTierListIds } from "@/lib/likesApi";
import PublicTierListCards from "./PublicTierListCards";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";

type SectionKey = "private" | "public" | "favorites" | "archived";
type ViewMode = "masonry" | "compact";

interface TemplateLibraryProps {
  searchQuery?: string;
  initialSection?: SectionKey;
}

const COVER_HEIGHTS = [320, 420, 360, 500, 390, 460];
const PUBLIC_PAGE_SIZE = 6;

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  searchQuery: initialSearchQuery = "",
  initialSection: initialSectionProp
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();

  // Читаем initialSection из location.state (для редиректа после создания шаблона)
  const locationInitialSection = (location.state as { initialSection?: SectionKey } | null)?.initialSection;

  // Приоритет: location.state > initialSection prop > default "private" (для личных шаблонов)
  const defaultSection: SectionKey = locationInitialSection || initialSectionProp || "private";

  // Используем initialSearchQuery напрямую как начальное значение
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const handleSectionChange = (section: SectionKey) => {
    setActiveSection(section);
    // Сбрасываем страницу при переключении на public секцию
    if (section === "public") {
      setPublicPage(1);
    }
  };

  const {
    data: templates,
    isLoading,
    isError,
    refetch: refetchTemplates,
  } = useUserTemplates();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(
    null,
  );
  // Инициализируем activeSection с defaultSection
  const [activeSection, setActiveSection] = useState<SectionKey>(defaultSection);
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");
  const [publicPage, setPublicPage] = useState(1);
  const deleteIdRef = useRef<string | null>(null);

  const sortBy: "updated_at" | "likes" | "created" = "likes";

  // Обработчики навигации
  const handleGoBack = () => {
    navigate("/");
  };

  const {
    data: publicTierListsData,
    isLoading: isLoadingPublicTierLists,
    isFetching: isFetchingPublicTierLists,
    refetch,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["publicTierListsSorted", sortBy, publicPage, PUBLIC_PAGE_SIZE],
    queryFn: async () => {
      console.log(
        "[TemplateLibrary] Fetching page:",
        publicPage,
        "pageSize:",
        PUBLIC_PAGE_SIZE,
        "sortBy:",
        sortBy,
      );
      const result = await getPublicTierLists(
        publicPage,
        PUBLIC_PAGE_SIZE,
        sortBy,
      );
      console.log("[TemplateLibrary] Received data:", {
        dataLength: result.data?.length,
        meta: result.meta,
        page: publicPage,
      });
      return result;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  // Принудительно обновляем данные при изменении страницы
  useEffect(() => {
    if (publicPage > 1) {
      console.log(
        "[TemplateLibrary] Page changed to:",
        publicPage,
        "- triggering refetch",
      );
      refetch(); // Используем refetch из useQuery публичных тир-листов
    }
  }, [publicPage, refetch]);

  // (removed debug logs)

  const { data: likedTierListIds } = useQuery({
    queryKey: ["likedTierListIds"],
    queryFn: () => apiGetLikedTierListIds(),
    refetchOnWindowFocus: true,
  });

  // Очищаем location.state один раз при монтировании
  useEffect(() => {
    if (locationInitialSection) {
      window.history.replaceState({}, document.title);
    }
  }, []);

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
      // "Личные шаблоны" — показываем все шаблоны пользователя (не архивные)
      if (activeSection === "private") {
        if (template.isArchived) return false;
      }
      if (activeSection === "favorites" && !template.isFavorite) return false;
      if (activeSection === "archived" && !template.isArchived) return false;
      if (activeSection === "public") return false; // Публичные тир-листы — это отдельная секция

      if (activeCategory !== "all" && template.category !== activeCategory)
        return false;

      if (!normalizedSearch) return true;
      const title = template.title.toLowerCase();
      const description = (template.description || "").toLowerCase();
      return (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [templates, activeSection, activeCategory, searchQuery]);

  const likedIdsSet = useMemo(
    () => new Set(likedTierListIds?.likedIds || []),
    [likedTierListIds?.likedIds],
  );

  const publicTierLists = publicTierListsData?.data || [];
  const publicMeta = publicTierListsData?.meta;

  // Получаем количество страниц из метаданных. Иногда meta может быть неполной
  // у клиента (например, из‑за реактивных обёрток). Дополнительно вычисляем
  // totalPages из totalItems как резервный вариант.
  const metaTotalPages =
    publicMeta?.totalPages ??
    (publicMeta?.totalItems
      ? Math.max(1, Math.ceil(publicMeta.totalItems / PUBLIC_PAGE_SIZE))
      : 1);

  // Если мы полностью загрузили первую страницу, но она заполнена полностью,
  // это может означать что есть ещё страницы. Но полагаемся на метаданные
  const totalPagesForUi = metaTotalPages;

  // Проверяем, есть ли следующая страница
  const hasNextPage = publicPage < totalPagesForUi;

  // Debug logs to help diagnose pagination issues in dev
  if (import.meta.env.DEV) {
    console.debug("TemplateLibrary: publicTierListsData", publicTierListsData);

    console.debug(
      "TemplateLibrary: publicMeta (stringified)",
      JSON.stringify(publicMeta || {}, null, 2),
    );

    console.debug(
      "TemplateLibrary: totalPagesForUi",
      totalPagesForUi,
      "publicPage",
      publicPage,
      "hasNextPage",
      hasNextPage,
    );
  }

  // (removed debug logs)

  useEffect(() => {
    // Не сбрасываем страницу автоматически - только если данные действительно отсутствуют
    // и это не состояние загрузки. Проблема: при переходе на страницу 2 данные временно пустые.
    if (
      activeSection === "public" &&
      !isLoadingPublicTierLists &&
      !isFetchingPublicTierLists &&
      publicPage > 1 &&
      publicTierLists.length === 0
    ) {
      console.warn("Page has no data, attempting to go back:", {
        publicPage,
        totalPages: totalPagesForUi,
      });
      // Не сбрасываем автоматически - даём пользователю понять что данных нет
      // setPublicPage((prev) => Math.max(1, prev - 1));
    }
  }, [
    activeSection,
    isLoadingPublicTierLists,
    isFetchingPublicTierLists,
    publicPage,
    publicTierLists.length,
    totalPagesForUi,
  ]);

  const pageNumbers = useMemo(() => {
    // Если всего страниц 7 или меньше, показываем все
    if (totalPagesForUi <= 7) {
      return Array.from({ length: totalPagesForUi }, (_, index) => index + 1);
    }

    const pages: (number | -1)[] = [];

    // Всегда показываем первую страницу
    pages.push(1);

    // Вычисляем диапазон для отображения текущей страницы
    // Показываем ±2 страницы от текущей
    let startPage = Math.max(2, publicPage - 2);
    let endPage = Math.min(totalPagesForUi - 1, publicPage + 2);

    // Если мало места между первой и стартом, расширяем начало
    if (startPage - 1 <= 2) {
      startPage = 2;
      endPage = Math.min(totalPagesForUi - 1, 5);
    }

    // Если мало места между концом и последней, расширяем конец
    if (totalPagesForUi - endPage <= 2) {
      endPage = totalPagesForUi - 1;
      startPage = Math.max(2, totalPagesForUi - 4);
    }

    // Добавляем многоточие если нужно
    if (startPage > 2) {
      pages.push(-1);
    }

    // Добавляем диапазон страниц
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Добавляем многоточие если нужно
    if (endPage < totalPagesForUi - 1) {
      pages.push(-1);
    }

    // Всегда показываем последнюю страницу
    pages.push(totalPagesForUi);

    return pages;
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
        sileo.success({ title: "Шаблон успешно удален", duration: 3000 });
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
        deleteIdRef.current = null;
      },
      onError: () => {
        sileo.error({ 
          title: "Не удалось удалить шаблон", 
          description: "Попробуйте снова позже",
          duration: 3000 
        });
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
        <p className="mb-4 text-red-300">
          Ошибка загрузки шаблонов. Пожалуйста, попробуйте снова.
        </p>
        <Button onClick={() => refetchTemplates()} variant="primary">
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header
        onMyRatingsClick={handleGoBack}
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        showTemplatesNav={true}
        showSearch={true}
        activeItem="Шаблоны"
      />
      <section className="relative min-h-screen pt-16">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(4,25,38,0.95)_0%,rgba(7,31,43,0.92)_35%,rgba(2,19,32,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(0,195,255,0.12),transparent_36%),radial-gradient(circle_at_84%_80%,rgba(31,124,158,0.1),transparent_38%)]" />

        <div className="relative px-4 pb-12 pt-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Title and description */}
            <div className="mb-8">
              <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#f3efe6] lg:text-5xl">
                Библиотека шаблонов
              </h1>
              <p className="text-base text-[#b8b1a3]">
                Публичные тир-листы сообщества и ваши персональные шаблоны
              </p>
              <div className="mt-4 h-1 w-24 bg-linear-to-r from-cyan-400 to-transparent rounded-full" />
            </div>

            {/* Main content */}
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="rounded-2xl border border-[#0b3f52]/70 bg-[#071f2b]/85 p-4 lg:sticky lg:top-22 lg:h-fit">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
                  Библиотека
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSectionChange("private")}
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
                    onClick={() => handleSectionChange("public")}
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
                    onClick={() => handleSectionChange("favorites")}
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
                    onClick={() => handleSectionChange("archived")}
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
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/70">
                      Категории
                    </p>
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
                  <p className="text-xs text-cyan-100/90">
                    Обновитесь до Pro для неограниченных шаблонов и кастомных
                    тем.
                  </p>
                  <Button className="mt-3 w-full" size="sm">
                    Обновить
                  </Button>
                </div>
              </aside>
              
              {/* Основной контент */}
              <div className="w-full min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#f3efe6]">
                    {activeSection === "public"
                      ? "Публичные тир-листы"
                      : "Личные шаблоны"}
                  </h3>
                  <p className="text-sm text-[#b8b1a3]">
                    {activeSection === "public"
                      ? "Подборка публичных рейтингов от сообщества."
                      : "Управляйте личной коллекцией шаблонов для рейтингов."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeSection !== "public" && (
                    <>
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
                      <Button onClick={() => navigate("/templates/new")} size="sm">
                        <Plus size={14} />
                        Создать шаблон
                      </Button>
                    </>
                  )}
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
                    />

                    <nav
                      className="mt-6 flex flex-col items-center justify-center gap-3"
                      aria-label="Пагинация публичных тир-листов"
                    >
                      {/* Информация о странице */}
                      <div className="text-xs text-[#b8b1a3]">
                        Страница{" "}
                        <span className="font-semibold text-cyan-100">
                          {publicPage}
                        </span>{" "}
                        из{" "}
                        <span className="font-semibold text-cyan-100">
                          {totalPagesForUi}
                        </span>
                      </div>

                      {/* Кнопки пагинации */}
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPublicPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={
                            publicPage === 1 || isFetchingPublicTierLists
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-800/80 bg-[#08293c] text-cyan-100 transition-colors hover:bg-[#0b3550] disabled:cursor-not-allowed disabled:opacity-45"
                          aria-label="Предыдущая страница"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        {pageNumbers.map((page, index) =>
                          page === -1 ? (
                            <span
                              key={`ellipsis-${index}-${page}`}
                              className="px-1 text-slate-400"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setPublicPage(page)}
                              disabled={isFetchingPublicTierLists}
                              aria-current={
                                publicPage === page ? "page" : undefined
                              }
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
                      </div>
                    </nav>
                  </>
                ) : (
                  <div className="rounded-md border border-white/20 bg-black/30 py-12 text-center">
                    <div className="mb-6">
                      <Globe size={56} className="mx-auto text-[#b8b1a3]" />
                    </div>
                    <h3 className="mb-2 font-display text-xl font-medium text-[#f3efe6]">
                      Нет публичных тир-листов
                    </h3>
                    <p className="mb-6 text-[#b8b1a3]">
                      Попробуйте зайти позже.
                    </p>
                  </div>
                )
              ) : filteredTemplates.length > 0 ? (
                viewMode === "masonry" ? (
                  <div className="w-full columns-1 gap-4 sm:columns-2 xl:columns-4">
                    {filteredTemplates.map((template, index) => (
                      <div key={template.id} className="break-inside-avoid">
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          variant="cover"
                          coverHeight={
                            COVER_HEIGHTS[index % COVER_HEIGHTS.length]
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <h3 className="mb-2 font-display text-xl font-medium text-[#f3efe6]">
                    Ничего не найдено
                  </h3>
                  <p className="mb-6 text-[#b8b1a3]">
                    Попробуйте сменить раздел, категорию или строку поиска.
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

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
    </div>
  );
};

export default TemplateLibrary;
