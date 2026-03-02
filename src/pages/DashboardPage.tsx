import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusCircle,
  RefreshCw,
  SearchX,
  AlertCircle,
  List,
  Edit2,
  Trash2,
  Clock,
  Globe,
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LogOut,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { Modal } from "@/ui/Modal";
import { useAuth } from "@/hooks/useAuthContext";
import { logger } from "@/lib/logger";
import {
  getUserTierLists,
  createTierList,
  updateTierListTitle,
  deleteTierList,
  type TierListShort,
} from "@/lib/api";
import heroBackground from "@/assets/avatars/fon.png";
import "./DashboardPage/DashboardPage.css";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [tierListToRename, setTierListToRename] =
    useState<TierListShort | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tierListToDelete, setTierListToDelete] = useState<TierListShort | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 10;

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

  const filteredTierLists = searchQuery
    ? allTierLists.filter((tierList) =>
        tierList.title.toLowerCase().startsWith(searchQuery.toLowerCase()),
      )
    : allTierLists;

  const tierLists = filteredTierLists;
  const pagination = paginatedResponse.meta;

  const handleMyRatingsClick = () => {
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

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
      navigate(`/tier-lists/${tierList.id}`);
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "createTierList" },
      );
      alert(
        `Ошибка: ${mutationError instanceof Error ? mutationError.message : "Unknown error"}`,
      );
    },
  });

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
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "renameTierList" },
      );
      alert(
        `Ошибка: ${mutationError instanceof Error ? mutationError.message : "Unknown error"}`,
      );
    },
  });

  const { mutate: removeTierList, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => deleteTierList(String(id)),
    onSuccess: () => {
      logger.info("Tier list deleted successfully");
      setIsDeleteModalOpen(false);
      setTierListToDelete(null);
      refetch();
    },
    onError: (mutationError) => {
      logger.error(
        mutationError instanceof Error
          ? mutationError
          : new Error(String(mutationError)),
        { action: "deleteTierList" },
      );
      alert(
        `Ошибка: ${mutationError instanceof Error ? mutationError.message : "Unknown error"}`,
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

  const handleOpenDeleteModal = (tierList: TierListShort) => {
    setTierListToDelete(tierList);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTierListToDelete(null);
  };

  const handleDeleteTierList = () => {
    if (!tierListToDelete) return;
    removeTierList(tierListToDelete.id);
  };
  const heroStyle = {
    "--dashboard-hero-image": `url(${heroBackground})`,
  } as CSSProperties;

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      onSearch={(query) => setSearchQuery(query)}
      searchValue={searchQuery}
    >
      <section className="dashboard-home">
        <div className="dashboard-home__container">
          <header className="dashboard-hero-banner" style={heroStyle}>
            <div className="dashboard-hero-banner__overlay">
              <p className="dashboard-hero-chip">Добро пожаловать, {user?.username}</p>
              <h1 className="dashboard-hero-title">
                Ранжируй свои списки
                <span>как профи</span>
              </h1>
              <p className="dashboard-hero-subtitle">
                Единая платформа, чтобы собирать, сравнивать и публиковать
                тир-листы. От свежих релизов до личной классики.
              </p>
              <button
                onClick={handleLogout}
                className="dashboard-btn dashboard-btn--logout dashboard-btn--hero-corner"
                type="button"
              >
                <LogOut size={16} />
                Выйти
              </button>
              <div className="dashboard-hero-actions">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="dashboard-btn dashboard-btn--primary dashboard-btn--hero"
                  type="button"
                >
                  <PlusCircle size={18} />
                  Создать тир-лист
                </button>
                <button
                  onClick={() => navigate("/community")}
                  className="dashboard-btn dashboard-btn--ghost dashboard-btn--hero"
                  type="button"
                >
                  Смотреть тренды
                </button>
              </div>
            </div>
          </header>

          <div className="dashboard-divider">
            <span>Ваши рейтинги</span>
          </div>

          {isLoading ? (
            <div className="dashboard-state">
              <RefreshCw className="animate-spin" size={20} />
              <span>Загрузка тир-листов...</span>
            </div>
          ) : searchQuery && filteredTierLists.length === 0 ? (
            <div className="dashboard-state dashboard-state--centered">
              <SearchX size={56} />
              <h2>Рейтинги не найдены</h2>
              <p>Попробуйте изменить поисковый запрос</p>
              <button
                onClick={() => setSearchQuery("")}
                className="dashboard-btn dashboard-btn--primary"
                type="button"
              >
                Показать все
              </button>
            </div>
          ) : error ? (
            <div className="dashboard-state dashboard-state--centered">
              <AlertCircle size={56} className="dashboard-state__error" />
              <h2>Ошибка загрузки тир-листов</h2>
              <p>
                {error instanceof Error
                  ? error.message
                  : "Не удалось загрузить ваши тир-листы. Убедитесь, что вы авторизованы."}
              </p>
              <button
                onClick={() => refetch()}
                className="dashboard-btn dashboard-btn--primary"
                type="button"
              >
                <RefreshCw size={16} />
                Попробовать снова
              </button>
            </div>
          ) : tierLists.length === 0 ? (
            <div className="dashboard-state dashboard-state--centered">
              <List size={56} />
              <h2>У вас еще нет тир-листов</h2>
              <p>Начните с создания первого рейтинга</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="dashboard-btn dashboard-btn--primary"
                type="button"
              >
                Создать первый тир-лист
              </button>
            </div>
          ) : (
            <>
              <div className="dashboard-grid">
                {tierLists.map((tierList: TierListShort) => {
                  const createdDate = new Date(tierList.createdAt);
                  const isNew =
                    new Date().getTime() - createdDate.getTime() <
                    24 * 60 * 60 * 1000;

                  return (
                    <article key={tierList.id} className="dashboard-card">
                      <div className="dashboard-card__actions">
                        <button
                          onClick={() => handleOpenRenameModal(tierList)}
                          className="dashboard-card__rename"
                          title="Переименовать"
                          type="button"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(tierList)}
                          className="dashboard-card__delete"
                          title="Удалить"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="dashboard-card__head">
                        <h3
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenTierList(tierList.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenTierList(tierList.id);
                            }
                          }}
                          className="dashboard-card__title cursor-pointer"
                        >
                          {tierList.title}
                        </h3>
                        {isNew && (
                          <span className="dashboard-badge">Новый</span>
                        )}
                      </div>

                      <div className="dashboard-card__meta">
                        <Clock size={15} />
                        <span>
                          {createdDate.toLocaleDateString("ru-RU", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="dashboard-card__tags">
                        {tierList.isPublic ? (
                          <span className="dashboard-tag">
                            <Globe size={14} />
                            Публичный
                          </span>
                        ) : (
                          <span className="dashboard-tag">
                            <Lock size={14} />
                            Приватный
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenTierList(tierList.id)}
                        className="dashboard-btn dashboard-btn--primary dashboard-card__open"
                        type="button"
                      >
                        Открыть
                      </button>
                    </article>
                  );
                })}
              </div>

              {pagination.totalPages > 1 && (
                <nav className="dashboard-pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="dashboard-btn dashboard-btn--ghost"
                    type="button"
                  >
                    <ArrowLeft size={16} />
                    Назад
                  </button>

                  <span>
                    Страница {currentPage} из {pagination.totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.min(pagination.totalPages, currentPage + 1),
                      )
                    }
                    disabled={currentPage === pagination.totalPages}
                    className="dashboard-btn dashboard-btn--ghost"
                    type="button"
                  >
                    Вперёд
                    <ArrowRight size={16} />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      >
        <div className="dashboard-modal">
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="dashboard-modal__close"
            type="button"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>

          <div>
            <h2>Создать новый тир-лист</h2>
            <p>Введите название для вашего нового рейтинга</p>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTierList();
            }}
            placeholder="Название тир-листа..."
            className="dashboard-modal__input"
          />

          <div className="dashboard-modal__actions">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="dashboard-btn dashboard-btn--ghost"
              type="button"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateTierList}
              disabled={isPending}
              className="dashboard-btn dashboard-btn--primary"
              type="button"
            >
              {isPending ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Создание...
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Создать
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isRenameModalOpen} onClose={handleCloseRenameModal}>
        <div className="dashboard-modal">
          <button
            onClick={handleCloseRenameModal}
            className="dashboard-modal__close"
            type="button"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>

          <div>
            <h2>Переименовать тир-лист</h2>
            <p>Введите новое название для рейтинга</p>
          </div>

          <input
            type="text"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            placeholder="Новое название тир-листа..."
            className="dashboard-modal__input"
          />

          <div className="dashboard-modal__actions">
            <button
              onClick={handleCloseRenameModal}
              className="dashboard-btn dashboard-btn--ghost"
              type="button"
            >
              Отмена
            </button>
            <button
              onClick={handleRename}
              disabled={isRenaming}
              className="dashboard-btn dashboard-btn--primary"
              type="button"
            >
              {isRenaming ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
        <div className="dashboard-modal">
          <button
            onClick={handleCloseDeleteModal}
            className="dashboard-modal__close"
            type="button"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>

          <div>
            <h2>Удалить тир-лист</h2>
            <p>
              Это действие нельзя отменить. Рейтинг{" "}
              <strong>{tierListToDelete?.title}</strong> будет удален навсегда.
            </p>
          </div>

          <div className="dashboard-modal__actions">
            <button
              onClick={handleCloseDeleteModal}
              className="dashboard-btn dashboard-btn--ghost"
              type="button"
              disabled={isDeleting}
            >
              Отмена
            </button>
            <button
              onClick={handleDeleteTierList}
              disabled={isDeleting}
              className="dashboard-btn dashboard-btn--danger"
              type="button"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Удалить
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}


