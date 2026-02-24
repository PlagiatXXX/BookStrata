import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import { useAuth } from "@/hooks/useAuthContext";
import { useTheme } from "@/hooks/useTheme";
import { logger } from "@/lib/logger";
import {
  getUserTierLists,
  createTierList,
  updateTierListTitle,
  type TierListShort,
} from "@/lib/api";
import TemplateSelector from "@/components/TemplateSelector/TemplateSelector";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [tierListToRename, setTierListToRename] =
    useState<TierListShort | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 10;

  // Загружаем список тир-листов с пагинацией
  const {
    data: paginatedResponse = {
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userTierLists", currentPage],
    queryFn: () => getUserTierLists(currentPage, PAGE_SIZE),
  });

  const allTierLists = paginatedResponse.data;

  // Фильтрация по поисковому запросу
  const filteredTierLists = searchQuery
    ? allTierLists.filter((tierList) =>
        tierList.title.toLowerCase().startsWith(searchQuery.toLowerCase()),
      )
    : allTierLists;

  const tierLists = filteredTierLists;

  const handleMyRatingsClick = () => {
    // Просто обновляем состояние страницы, чтобы сбросить фильтр поиска
    setCurrentPage(1);
    setSearchQuery("");
  };
  const pagination = paginatedResponse.meta;

  // Создание нового тир-листа
  const { mutate: createNewTierList, isPending } = useMutation({
    mutationFn: (title: string) => createTierList(title),
    onSuccess: (tierList) => {
      logger.info("New tier list created - navigating to editor", {
        id: tierList.id,
        title: tierList.title,
      });
      setIsCreateModalOpen(false);
      setNewTitle("");
      refetch();
      // Переходим на страницу редактирования
      navigate(`/tier-lists/${tierList.id}`);
    },
    onError: (error) => {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: "createTierList",
      });
      alert(
        `Ошибка: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });

  // Переименование тир-листа
  const { mutate: renameTierList, isPending: isRenaming } = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      updateTierListTitle(String(id), title),
    onSuccess: () => {
      logger.info("Tier list renamed successfully");
      setIsRenameModalOpen(false);
      setTierListToRename(null);
      setRenameTitle("");
      refetch();
    },
    onError: (error) => {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: "renameTierList",
      });
      alert(
        `Ошибка: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });

  const handleCreateTierList = () => {
    if (!newTitle.trim()) {
      alert("Пожалуйста, введите название для тир-листа");
      return;
    }
    createNewTierList(newTitle);
  };

  const handleOpenTierList = (id: number) => {
    logger.info("Opening tier list editor", { id });
    navigate(`/tier-lists/${id}`);
  };

  const handleOpenRenameModal = (tierList: TierListShort) => {
    setTierListToRename(tierList);
    setRenameTitle(tierList.title);
    setIsRenameModalOpen(true);
  };

  const handleRename = () => {
    if (!renameTitle.trim()) {
      alert("Пожалуйста, введите название для тир-листа");
      return;
    }
    if (tierListToRename) {
      renameTierList({ id: tierListToRename.id, title: renameTitle });
    }
  };

  const handleCloseRenameModal = () => {
    setIsRenameModalOpen(false);
    setTierListToRename(null);
    setRenameTitle("");
  };

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      onSearch={(query) => setSearchQuery(query)}
      searchValue={searchQuery}
    >
      <main className="flex-1 overflow-y-auto bg-linear-to-br from-background-dark via-[#0f0515] to-[#1a0d1d] dark:from-background-dark dark:via-[#0f0515] dark:to-[#1a0d1d]">
        {/* Hero Section */}
        <div className="relative overflow-hidden px-4 lg:px-8 pt-12 pb-20">
          {/* Decorative gradient blobs */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div className="flex-1">
                <h1
                  className={`text-5xl lg:text-6xl font-bold ${
                    theme === "light"
                      ? "text-cyan-600"
                      : "bg-linear-to-r from-white via-purple-200 to-cyan-300 dark:from-cyan dark:via-purple-200 dark:to-cyan-300 bg-clip-text text-transparent"
                  } mb-4`}
                >
                  Мои Тир-листы
                </h1>
                <p
                  className={`text-lg ${
                    theme === "light"
                      ? "text-gray-800 dark:text-gray-200"
                      : "text-gray-300"
                  } mb-2`}
                >
                  Привет,{" "}
                  <span
                    className={`font-semibold ${
                      theme === "light"
                        ? "text-cyan-700 dark:text-cyan-300"
                        : "text-cyan-400"
                    }`}
                  >
                    {user?.username}
                  </span>
                  !
                </p>
                <p
                  className={`text-sm ${
                    theme === "light"
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-400"
                  }`}
                >
                  Управляйте и организуйте ваши рейтинги в одном месте
                </p>
              </div>
              <button
                onClick={logout}
                className="cursor-pointer px-6 py-3 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-red-600/50"
              >
                Выход
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 flex-wrap">
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-8 py-4 text-lg"
              >
                <span className="material-symbols-outlined mr-2 align-middle">
                  add_circle
                </span>
                Создать новый тир-лист
              </Button>

              <TemplateSelector onSelect={() => {}} />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="mb-12">
              <h2
                className={`text-2xl font-bold ${
                  theme === "light"
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-white"
                } mb-2`}
              >
                {tierLists.length > 0 ? "Ваши рейтинги" : "Начните создавать"}
              </h2>
              <div className="h-1 w-16 bg-linear-to-r from-cyan-400 to-purple-600 rounded"></div>
            </div>

            {/* Tier Lists Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400 text-lg">
                  <span className="material-symbols-outlined inline-block animate-spin mr-3">
                    refresh
                  </span>
                  Загрузка тир-листов...
                </div>
              </div>
            ) : searchQuery && filteredTierLists.length === 0 ? (
              <div className="text-center py-20">
                <div className="mb-6">
                  <span className="material-symbols-outlined text-7xl text-gray-500 dark:text-gray-500 light:text-gray-400 inline-block">
                    search_off
                  </span>
                </div>
                <p
                  className={`text-xl ${
                    theme === "light"
                      ? "text-gray-700 dark:text-gray-200"
                      : "text-gray-300"
                  } mb-4`}
                >
                  Рейтинги не найдены
                </p>
                <p
                  className={`text-gray-400 ${
                    theme === "light"
                      ? "text-gray-600 dark:text-gray-300"
                      : "text-gray-400"
                  } mb-8`}
                >
                  Попробуйте изменить поисковый запрос
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all cursor-pointer"
                >
                  Показать все рейтинги
                </button>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="mb-6">
                    <span className="material-symbols-outlined text-7xl text-red-500 inline-block">
                      error_outline
                    </span>
                  </div>
                  <p className="text-xl text-red-400 mb-2">
                    Ошибка загрузки тир-листов
                  </p>
                  <p
                    className={`text-gray-400 ${
                      theme === "light"
                        ? "text-gray-600 dark:text-gray-300"
                        : "text-gray-400"
                    } mb-6 max-w-md`}
                  >
                    {error instanceof Error
                      ? error.message
                      : "Не удалось загрузить ваши тир-листы. Убедитесь, что вы авторизованы."}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    Попробовать снова
                  </Button>
                </div>
              </div>
            ) : tierLists.length === 0 ? (
              <div className="text-center py-20">
                <div className="mb-6">
                  <span
                    className={`material-symbols-outlined text-7xl ${
                      theme === "light"
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-500"
                    } inline-block`}
                  >
                    list_alt
                  </span>
                </div>
                <p
                  className={`text-xl ${
                    theme === "light"
                      ? "text-gray-700 dark:text-gray-200"
                      : "text-gray-300"
                  } mb-4`}
                >
                  У вас еще нет тир-листов
                </p>
                <p
                  className={`text-gray-400 ${
                    theme === "light"
                      ? "text-gray-600 dark:text-gray-300"
                      : "text-gray-400"
                  } mb-8`}
                >
                  Начните с создания вашего первого рейтинга прямо сейчас
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Создать первый тир-лист
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tierLists.map((tierList: TierListShort) => {
                  const createdDate = new Date(tierList.created_at);
                  const isNew =
                    new Date().getTime() - createdDate.getTime() <
                    24 * 60 * 60 * 1000;

                  return (
                    <div
                      key={tierList.id}
                      className="group relative bg-linear-to-br from-slate-800/60 to-slate-900/60 dark:from-slate-800/60 dark:to-slate-900/60 light:from-white/80 light:to-gray-100/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 dark:border-slate-700/50 light:border-gray-300/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-400/20 overflow-hidden"
                    >
                      {/* Decorative corner */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-cyan-400/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      {/* Кнопка переименования */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRenameModal(tierList);
                        }}
                        className="absolute top-2 right-2 z-20 p-1 rounded bg-transparent hover:bg-cyan-500/50 text-gray-300 hover:text-white transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100 cursor-pointer border-gray-500/30 hover:border-cyan-400/30"
                        title="Переименовать"
                      >
                        <span className="material-symbols-outlined text-base">
                          edit
                        </span>
                      </button>

                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-start gap-2 mb-3">
                          <h3
                            onClick={() => handleOpenTierList(tierList.id)}
                            className="text-xl font-bold text-white dark:text-white light:text-gray-900 light:dark:text-gray-100 group-hover:text-cyan-300 transition-colors line-clamp-2 cursor-pointer"
                          >
                            {tierList.title}
                          </h3>
                          {isNew && (
                            <span className="inline-block px-3 py-1 bg-linear-to-r from-green-500/80 to-emerald-600/80 text-white text-xs font-semibold rounded-full shrink-0">
                              Новый
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 light:dark:text-gray-300 mb-4">
                          <span className="material-symbols-outlined text-base">
                            schedule
                          </span>
                          <span>
                            {createdDate.toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="flex gap-2 flex-wrap">
                          {tierList.is_public && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-300 dark:text-blue-300 light:text-blue-600 light:dark:text-blue-400 text-xs font-medium rounded-full border border-blue-400/30">
                              <span className="material-symbols-outlined text-sm">
                                public
                              </span>
                              Публичный
                            </span>
                          )}
                          {!tierList.is_public && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/20 text-gray-300 dark:text-gray-300 light:text-gray-600 light:dark:text-gray-300 text-xs font-medium rounded-full border border-gray-400/30">
                              <span className="material-symbols-outlined text-sm">
                                lock
                              </span>
                              Приватный
                            </span>
                          )}
                        </div>

                        {/* Open button */}
                        <div className="mt-6 pt-4 border-t border-slate-600/50 dark:border-slate-600/50 light:border-gray-300/50 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenTierList(tierList.id)}
                            className="cursor-pointer w-full px-4 py-2 bg-linear-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/40 hover:to-purple-600/40 text-cyan-300 font-medium rounded-lg transition-all"
                          >
                            Открыть
                          </button>
                        </div>
                      </div>

                      {/* Hover indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-400 to-purple-600 transform md:scale-x-0 md:group-hover:scale-x-100 scale-x-100 transition-transform origin-left"></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {tierLists.length > 0 && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12 pt-12 border-t border-slate-700/50 dark:border-slate-700/50 light:border-gray-300/50">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/40 hover:to-purple-600/40 text-cyan-300 hover:text-cyan-200 disabled:hover:from-cyan-500/20 disabled:hover:to-purple-600/20"
                >
                  <span className="material-symbols-outlined inline-block mr-2 text-lg align-middle">
                    arrow_back
                  </span>
                  Назад
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-400 light:text-gray-600 font-medium">
                    Страница {currentPage} из {pagination.totalPages}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1),
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                  className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/40 hover:to-purple-600/40 text-cyan-300 hover:text-cyan-200 disabled:hover:from-cyan-500/20 disabled:hover:to-purple-600/20"
                >
                  Вперёд
                  <span className="material-symbols-outlined inline-block ml-2 text-lg align-middle">
                    arrow_forward
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Модальное окно создания тир-листа */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      >
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold bg-linear-to-r from-white to-cyan-300 dark:from-white dark:to-cyan-300 light:from-gray-800 light:to-cyan-600 bg-clip-text text-transparent mb-2">
              Создать новый тир-лист
            </h2>
            <p
              className={`text-gray-400 ${
                theme === "light"
                  ? "text-gray-600 dark:text-gray-300"
                  : "text-gray-400"
              }`}
            >
              Введите название для вашего нового рейтинга
            </p>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleCreateTierList();
            }}
            placeholder="Название тир-листа..."
            className={`w-full px-4 py-3 bg-slate-700/50 dark:bg-slate-700/50 light:bg-gray-100/50 border border-slate-600 dark:border-slate-600 light:border-gray-300 rounded-lg ${
              theme === "light"
                ? "text-gray-900 dark:text-gray-100"
                : "text-white"
            } placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all`}
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTierList}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined inline-block animate-spin mr-2">
                    refresh
                  </span>
                  Создание...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined inline-block mr-2">
                    add_circle
                  </span>
                  Создать
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно переименования тир-листа */}
      <Modal isOpen={isRenameModalOpen} onClose={handleCloseRenameModal}>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold bg-linear-to-r from-white to-cyan-300 dark:from-white dark:to-cyan-300 light:from-gray-800 light:to-cyan-600 bg-clip-text text-transparent mb-2">
              Переименовать тир-лист
            </h2>
            <p
              className={`text-gray-400 ${
                theme === "light"
                  ? "text-gray-600 dark:text-gray-300"
                  : "text-gray-400"
              }`}
            >
              Введите новое название для вашего рейтинга
            </p>
          </div>

          <input
            type="text"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            placeholder="Новое название тир-листа..."
            className={`w-full px-4 py-3 bg-slate-700/50 dark:bg-slate-700/50 light:bg-gray-100/50 border border-slate-600 dark:border-slate-600 light:border-gray-300 rounded-lg ${
              theme === "light"
                ? "text-gray-900 dark:text-gray-100"
                : "text-white"
            } placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all`}
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={handleCloseRenameModal}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleRename}
              disabled={isRenaming}
            >
              {isRenaming ? (
                <>
                  <span className="material-symbols-outlined inline-block animate-spin mr-2">
                    refresh
                  </span>
                  Сохранение...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined inline-block mr-2">
                    check_circle
                  </span>
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
