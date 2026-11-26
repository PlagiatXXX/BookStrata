import "./ExportThemes.css";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { sileo } from "sileo";
import type { DragEndEvent } from "@dnd-kit/core";
import { useTierList } from "@/hooks/useTierList";
import type { Action } from "@/hooks/useTierList";
import { useAuth } from "@/hooks/useAuthContext";
import { createLogger } from "@/lib/logger";
import { resolveDisplayTheme } from "@/lib/tierListApi";
import { EditorModals } from "./components/EditorModals";
import { EditorLayout } from "./components/EditorLayout";
import { EditorMainContent } from "./components/EditorMainContent";
import { EditorScreens } from "./components/EditorScreens";
import { StreamModeExitButton } from "./components/StreamModeExitButton";
import { TierListTextBreakdown } from "./components/TierListTextBreakdown";
import { useTierEditorActions } from "./hooks/useTierEditorActions";
import { useTierEditorState } from "./hooks/useTierEditorState";
import { buildTierListJsonLd } from "./buildTierListJsonLd";
import { processBookFiles as processBookFilesUtil } from "./processBookFiles";
import { useUndoDeleteBook } from "./hooks/useUndoDeleteBook";
import { useTierEditorQueries } from "./hooks/useTierEditorQueries";
import { useTierEditorDrag } from "./hooks/useTierEditorDrag";
import { useTierEditorBlocker } from "./hooks/useTierEditorBlocker";
import { useTierEditorSave } from "./hooks/useTierEditorSave";
import { resolveDemoInitialData } from "./_initialData";
import {
  buildTierListSeoDescription,
  buildTierListSeoTitle,
  sanitizePublicAuthorName,
  shouldNoindexTierList,
} from "./seo";
import { getBookViewAction } from "./bookClick";
import { pushDataLayerEvent } from "@/lib/gtm";
import { useBookshelf } from "@/hooks/useBookshelf";
import { TasteMatchBanner } from "@/components/TasteMatchBanner/TasteMatchBanner";
import { SimilarTierListsCarousel } from "@/components/SimilarTierLists/SimilarTierListsCarousel";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { AiLibrarianWidget } from "@/components/AiLibrarian/AiLibrarianWidget";
import { AiRecommendationPrompt } from "@/components/AiLibrarian/AiRecommendationPrompt";
import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/SEO/SEOHead";

import { useDemoStorage, DEMO_DEFAULT_THEME } from "./hooks/useDemoStorage";
import { useDemoOnboarding } from "./hooks/useDemoOnboarding";
import { AuthOnSaveModal } from "./components/AuthOnSaveModal";
import { ShareSuccessModal } from "./components/ShareSuccessModal";
import { TierListRoastModal } from "./components/TierListRoastModal";
import { DemoOnboarding } from "./components/DemoOnboarding";
import { apiTrackEvent } from "@/lib/analyticsApi";
import { UNRANKED_AREA_ID } from "@/constants/dnd";
import "./TierEditorPage.css";
import type { Book, Tier, TierListData } from "@/types";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );

// Логгер для страницы редактора
const logger = createLogger("TierEditorPage", { color: "green" });

// Внутренний компонент с ключом для автоматического сброса состояния
const TierListEditorContent = () => {
  const { id: tierListId = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const fromBattle = searchParams.get("context") === "battle";
  const forkSlug = searchParams.get("fork");
  const templateId = searchParams.get("template");
  const celebrityForkSlug = searchParams.get("celebrityFork");
  const forkReadIds = useMemo(() => {
    const raw = searchParams.get("readIds");
    return raw ? raw.split(",").filter(Boolean) : null;
  }, [searchParams]);
  // Гость пришёл из полки: /tier-lists/new?from=shelf&section=want&title=...
  const fromShelf = searchParams.get("from") === "shelf";
  const shelfSection = searchParams.get("section");
  const shelfTitle = searchParams.get("title");
  const navigate = useNavigate();

  // Получаем все состояния из хука
  const {
    // Состояния для отслеживания несохраненных изменений
    hasUnsavedChanges,
    setHasUnsavedChanges,
    deletedTierIds,
    setDeletedTierIds,

    // Состояния модальных окон
    showUnsavedModal,
    setShowUnsavedModal,
    showDeleteRatingModal,
    setShowDeleteRatingModal,
    ignoreUnsavedBlocker,
    setIgnoreUnsavedBlocker,
    isSearchModalOpen,
    setIsSearchModalOpen,

    isSavingBeforeLeave,
    setIsSavingBeforeLeave,
    isExportModalOpen,
    setIsExportModalOpen,

    // D&D состояния
    activeItem,
    setActiveItem,
    tierToDelete,
    setTierToDelete,
    bookToDelete,
    setBookToDelete,
    activeTierId,
    setActiveTierId,
    isClearAllModalOpen,
    setIsClearAllModalOpen,
    bookToEdit,
    setBookToEdit,
    bookToView,
    setBookToView,

    // Режим стрим
    isStreamMode,
    setIsStreamMode,
  } = useTierEditorState(tierListId);

  // Получаем данные и настройки пользователя
  const { user: authUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Реальный ID тир-листа после его создания на сервере (когда tierListId="new").
  // Нужен, чтобы React Query мог загрузить apiData после первого сохранения.
  const [createdTierListId, setCreatedTierListId] = useState<string | null>(
    null,
  );
  const effectiveTierListId = createdTierListId || tierListId;

  // Получаем данные через React Query
  const {
    isLoading,
    isError,
    error,
    apiData,
    likesData,
    isPublic,
    initialDataForHook,
  } = useTierEditorQueries(
    tierListId,
    forkSlug,
    forkReadIds,
    templateId,
    celebrityForkSlug,
    createdTierListId,
    { isAuthLoading, isAuthenticated },
  );

  // ========== ДЕМО-РЕЖИМ (часть 1: инициализация) ==========
  const isDemo = tierListId === "new" && !isAuthenticated;
  const { loadDemo, saveDemo, clearDemo, getDemoTheme, saveDemoTheme } = useDemoStorage();

  // Переопределения от пользователя (null = не менял, берём из apiData)
  const [userCoverOverride, setUserCoverOverride] = useState<string | null>(
    null,
  );
  const [userThemeOverride, setUserThemeOverride] = useState<string | null>(() => {
    // В демо-режиме (или при создании нового списка без авторизации):
    // восстанавливаем тему из localStorage или используем "autumn-rain" по умолчанию
    if (tierListId === "new" && !isAuthenticated) {
      return getDemoTheme();
    }
    return null;
  });
  const [tierListDescription, setTierListDescription] = useState<string>("");

  const handleThemeChanged = useCallback((newTheme: string) => {
    setUserThemeOverride(newTheme);
    if (isDemo || tierListId === "new") {
      saveDemoTheme(newTheme);
    }
  }, [isDemo, tierListId, saveDemoTheme]);

  // Синхронизация описания с apiData
  useEffect(() => {
    if (apiData?.description !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTierListDescription(apiData.description || "");
    }
  }, [apiData?.description]);

  const displayCoverImageUrl =
    userCoverOverride !== null
      ? userCoverOverride
      : (apiData?.coverImageUrl ?? null);
  const displayTheme =
    userThemeOverride !== null
      ? userThemeOverride
      : (apiData?.theme ?? (isDemo ? DEMO_DEFAULT_THEME : "default"));

  const isAdmin = authUser?.role === "admin";

  // Старые темы из БД (midnight, frost и т.д.) приводятся к "default",
  // а темы в разработке (autumn-leaves, winter-newyear) для не-админов подменяются на открытые аналоги
  const normalizedDisplayTheme =
    displayTheme !== null ? resolveDisplayTheme(displayTheme, isAdmin) : "default";

  const [isAiLibrarianOpen, setAiLibrarianOpen] = useState(false);

  const handleAiLibrarianOpen = useCallback(() => setAiLibrarianOpen(true), []);
  const handleAiLibrarianClose = useCallback(
    () => setAiLibrarianOpen(false),
    [],
  );

  // Заменяем UUID на slug в URL после загрузки данных
  useEffect(() => {
    if (apiData?.slug && isUuid(tierListId)) {
      window.history.replaceState(null, "", `/tier-lists/${apiData.slug}`);
    }
  }, [apiData?.slug, tierListId]);

  // Извлекаем ID владельца и текущего пользователя
  const ownerUserId = apiData?.user?.id;
  const currentUserId = authUser?.userId;
  const isOwner = currentUserId === ownerUserId;

  // Режим просмотра (если не владелец). Чужой приватный список видит
  // только staff (admin/moderator) — для него тоже read-only.
  const isReadOnly = !isOwner && (isPublic || !!apiData);

  // ========== ДЕМО-РЕЖИМ (часть 1: книги гостевой полки) ==========

  // Книги гостевой полки — для предзаполнения при ?from=shelf.
  // Гостевая полка живёт в localStorage (shelf + guestBookMeta).
  const { shelf: guestShelf, guestBookMeta } = useBookshelf();
  const shelfBooks = useMemo<Book[]>(() => {
    if (!fromShelf || !isDemo) return [];
    const books: Book[] = [];
    for (const [bookKey, status] of Object.entries(guestShelf)) {
      if (shelfSection === "read" && status !== "read") continue;
      if (shelfSection === "want" && status !== "want_to_read") continue;
      const meta = guestBookMeta[bookKey];
      if (!meta?.title) continue; // без данных книги карточку не собрать
      books.push({
        id: bookKey,
        title: meta.title,
        author: meta.author ?? "",
        coverImageUrl: meta.coverImageUrl ?? "",
        genre: meta.genre ?? "",
        description: meta.description ?? "",
        slug: meta.slug ?? null,
      });
    }
    return books;
  }, [fromShelf, isDemo, shelfSection, guestShelf, guestBookMeta]);

  // Если есть сохранённый черновик в localStorage — используем его (для демо и после регистрации).
  // При открытии по ссылке с шаблоном (?template=N) черновик игнорируем — показываем шаблон.
  const [demoInitialData] = useState<TierListData | null>(() => {
    if (tierListId === "new" && !templateId && !forkSlug)
      return loadDemo() ?? null;
    return null;
  });

  // Приоритет: демо-черновик > книги полки (?from=shelf) > дефолтные демо-книги
  const effectiveInitialData = resolveDemoInitialData({
    tierListId,
    isAuthenticated,
    templateId,
    forkSlug,
    fromShelf,
    shelfTitle,
    demoDraft: demoInitialData,
    shelfBooks,
    fallback: initialDataForHook,
  });

  // Аналитика воронки: вход в редактор из полки (один раз на монтирование)
  const shelfEntryTrackedRef = useRef(false);
  useEffect(() => {
    if (shelfEntryTrackedRef.current) return;
    if (fromShelf && isDemo && shelfBooks.length > 0) {
      shelfEntryTrackedRef.current = true;
      pushDataLayerEvent("editor_opened_from_shelf", {
        books_count: shelfBooks.length,
        section: shelfSection,
      });
    }
  }, [fromShelf, isDemo, shelfBooks, shelfSection]);

  // Состояние для модалки регистрации (используется в части 2)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [demoTitle, setDemoTitle] = useState(
    initialDataForHook.title || "Новый тир-лист",
  );

  // ========== ОНБОРДИНГ ДЕМО-РЕЖИМА ==========
  // Показывается один раз на браузер (флаг в localStorage), а не при каждом заходе в демо-режим
  const {
    step: onboardingStep,
    next: handleOnboardingNext,
    skip: handleOnboardingSkip,
  } = useDemoOnboarding(isDemo);
  // ========== КОНЕЦ ОНБОРДИНГА ==========

  // ========== КОНЕЦ ДЕМО-РЕЖИМ (часть 1) ==========

  // Получаем функции из хука useTierList
  const {
    listData,
    dispatch,
    handleDragEnd,
    deleteBook,
    restoreBook,
    addRow,
    updateTierSettings,
    renameTier,
    clearRows,
    removeTier,
    updateBook,
  } = useTierList(effectiveInitialData, !hasUnsavedChanges);

  // ========== ДЕМО-РЕЖИМ (часть 2: автосохранение и сохранение на сервер) ==========
  const saveDemoRef = useRef(saveDemo);
  useEffect(() => {
    saveDemoRef.current = saveDemo;
  });

  // Тост о восстановлении черновика после регистрации
  useEffect(() => {
    if (tierListId === "new" && isAuthenticated && demoInitialData) {
      sileo.success({
        title: "Черновик восстановлен",
        description: "Вы можете продолжить редактирование и сохранить тир-лист",
        duration: 5000,
      });
    }
  }, [tierListId, isAuthenticated, demoInitialData]);

  // Автосохранение демо-черновика в localStorage (с debounce)
  useEffect(() => {
    if (!isDemo) return;
    const timer = setTimeout(() => {
      saveDemoRef.current(listData);
    }, 800);
    return () => clearTimeout(timer);
  }, [isDemo, listData]);

  // ========== КОНЕЦ ДЕМО-РЕЖИМ (часть 2) ==========

  // Обложка первой книги для красивого превью при шеринге и Open Graph
  const firstBookCoverUrl = useMemo(() => {
    for (const tierId of listData.tierOrder) {
      const bookIds = listData.tiers[tierId]?.bookIds || [];
      for (const bookId of bookIds) {
        const book = listData.books[bookId];
        if (book?.coverImageUrl) return book.coverImageUrl;
      }
    }
    const unranked = listData.unrankedBookIds || [];
    for (const bookId of unranked) {
      const book = listData.books[bookId];
      if (book?.coverImageUrl) return book.coverImageUrl;
    }
    return null;
  }, [listData]);

  // ========== ОПТИМИЗИРОВАННОЕ АВТОСОХРАНЕНИЕ ==========
  const [showShareSuccessModal, setShowShareSuccessModal] = useState(false);
  const [firstCreatedSharePath, setFirstCreatedSharePath] = useState<string | null>(null);
  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);

  const orderedTiers = useMemo(() => {
    return (listData.tierOrder || []).map((id) => listData.tiers[id]).filter(Boolean);
  }, [listData.tierOrder, listData.tiers]);

  const totalPlacedBooks = useMemo(() => {
    return Object.values(listData.tiers || {}).reduce(
      (acc: number, tier: Tier) => acc + (tier.bookIds?.length || 0),
      0,
    );
  }, [listData.tiers]);

  const handleRoastClick = useCallback(() => {
    if (isReadOnly) return;
    if (totalPlacedBooks < 4) {
      sileo.info({
        title: "Нужно больше книг",
        description: "Разложите хотя бы 4 книги по рядам, чтобы ИИ мог оценить расстановку",
      });
      return;
    }
    setIsRoastModalOpen(true);
  }, [isReadOnly, totalPlacedBooks]);

  const handleFirstSaveSuccess = useCallback((urlPath: string) => {
    setFirstCreatedSharePath(urlPath);
    setShowShareSuccessModal(true);
  }, []);

  const { saveStatus, lastSaved, handleSave } = useTierEditorSave({
    tierListId,
    listData,
    dispatch: dispatch as React.Dispatch<Action>,
    isLoading,
    isReadOnly,
    setHasUnsavedChanges,
    logger,
    theme: normalizedDisplayTheme,
    description: tierListDescription,
    onTierListCreated: setCreatedTierListId,
    onFirstSaveSuccess: handleFirstSaveSuccess,
  });

  // Ref на handleSave для использования после обновления состояния (регистрация)
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);



  // При успешной регистрации:
  // 1. Применяем название, которое пользователь ввёл в модалке
  // 2. Закрываем модалку
  // 3. Автоматически сохраняем тир-лист на сервер
  const handleDemoSaveSuccess = useCallback(async () => {
    // Шаг 1: применяем название к данным редактора
    dispatch({ type: "SET_TITLE", payload: demoTitle });

    // Шаг 2: закрываем модалку
    setShowAuthModal(false);

    // Шаг 3: сохраняем на сервер, передавая название напрямую (без setTimeout),
    // чтобы не зависеть от того, успел ли React обновить listData.title.
    const saved = await handleSaveRef.current(demoTitle);
    if (saved) {
      clearDemo();
    }
  }, [demoTitle, dispatch, clearDemo]);

  const openDemoAuthModal = useCallback(() => {
    setDemoTitle(listData.title === "Новый тир-лист" ? "" : listData.title);
    setShowAuthModal(true);
  }, [listData.title]);

  // Автосохранение по таймеру (каждые 30 сек) — не в демо-режиме
  useEffect(() => {
    if (isReadOnly || !tierListId || isDemo) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges && saveStatus !== "saving") {
        handleSave();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [
    handleSave,
    isReadOnly,
    hasUnsavedChanges,
    saveStatus,
    tierListId,
    isDemo,
  ]);
  // ========== КОНЕЦ АВТОСОХРАНЕНИЯ ==========

  // Перехват сохранения: в демо-режиме открываем регистрацию, иначе стандартный save
  const handleSaveOrRegister = useCallback(async () => {
    if (isDemo) {
      openDemoAuthModal();
    } else {
      // При сохранении с "new" на сервер — чистим localStorage от демо-данных
      await handleSave();
      if (tierListId === "new") {
        clearDemo();
      }
    }
  }, [isDemo, handleSave, tierListId, clearDemo, openDemoAuthModal]);

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();

        if (!isReadOnly && hasUnsavedChanges && saveStatus !== "saving") {
          handleSaveOrRegister();
        } else if (isReadOnly) {
          logger.info("Ctrl+S pressed in read-only mode, prevented default");
        } else if (saveStatus === "saving") {
          logger.info("Ctrl+S pressed while saving, prevented default");
        } else if (!hasUnsavedChanges) {
          logger.info(
            "Ctrl+S pressed with no unsaved changes, prevented default",
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveOrRegister, isReadOnly, hasUnsavedChanges, saveStatus]);

  // Получаем функции из хука действий
  const {
    togglePublic,
    isTogglingPublic,
    isUpdatingBook,
    handleSaveBook,
    handleDeleteBook,
    handleBookAdded,
    deleteRatingFromServer,
  } = useTierEditorActions({
    tierListId,
    dispatch: dispatch as React.Dispatch<Action>,
    updateBook,
    deletedTierIds,
    setHasUnsavedChanges,
    setDeletedTierIds,
    navigate,
    onRequireAuth: openDemoAuthModal,
  });

  const processBookFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const result = await processBookFilesUtil(files, listData.books);

      if (result.error) {
        sileo.error({
          title: result.error.title,
          description: result.error.description,
        });
        return;
      }

      const { added, skipped } = result;

      if (added.length === 0) {
        if (files.length === 1) {
          sileo.info({
            title: "Книга уже добавлена",
            description: "Эта книга уже есть в тир-листе",
            duration: 2500,
          });
        } else {
          const d = files.length % 10;
          const dd = files.length % 100;
          const w =
            d === 1 && dd !== 11
              ? "книга"
              : d >= 2 && d <= 4 && (dd < 12 || dd > 14)
                ? "книги"
                : "книг";
          sileo.info({
            title: "Книги уже добавлены",
            description: `Все ${files.length} ${w} уже есть в тир-листе`,
            duration: 2500,
          });
        }
        return;
      }

      // Один dispatch на весь пакет — без N лишних ререндеров
      dispatch({
        type: "ADD_BOOKS",
        payload: { newBooks: added },
      });
      setHasUnsavedChanges(true);

      const n = added.length;
      const lastDigit = n % 10;
      const lastTwoDigits = n % 100;
      const prefix =
        lastDigit === 1 && lastTwoDigits !== 11
          ? "Загружена"
          : lastDigit >= 2 &&
              lastDigit <= 4 &&
              (lastTwoDigits < 12 || lastTwoDigits > 14)
            ? "Загружены"
            : "Загружено";
      const word =
        lastDigit === 1 && lastTwoDigits !== 11
          ? "книга"
          : lastDigit >= 2 &&
              lastDigit <= 4 &&
              (lastTwoDigits < 12 || lastTwoDigits > 14)
            ? "книги"
            : "книг";
      const title =
        skipped > 0
          ? `${prefix} ${n} ${word} (${skipped} ${skipped === 1 ? "уже была" : "уже были"})`
          : `${prefix} ${n} ${word}`;
      sileo.success({
        title,
        duration: 3000,
      });
    },
    [dispatch, setHasUnsavedChanges, listData.books],
  );

  const { deleteBookWithUnsaved, cancelPendingDeletes } = useUndoDeleteBook({
    listData,
    deleteBook,
    restoreBook,
    setHasUnsavedChanges,
    handleDeleteBook,
  });

  const handleUploadBooks = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      await processBookFiles(files);
    },
    [processBookFiles],
  );

  // Обработчики с установкой hasUnsavedChanges
  const handleDragEndWithUnsaved = (event: DragEndEvent) => {
    const changed = handleDragEnd(event);
    if (changed) {
      setHasUnsavedChanges(true);
      const activeData = event.active.data.current;
      const overData = event.over?.data.current;
      if (activeData?.type === "book" && overData?.containerId) {
        const book =
          activeData.book ||
          listData.books[String(event.active.id).replace("book-", "")];
        if (overData.containerId === UNRANKED_AREA_ID) {
          apiTrackEvent("book_unranked", {
            bookTitle: book?.title,
            tierListId: listData.id,
          });
        } else {
          const tier = listData.tiers[overData.containerId];
          apiTrackEvent("book_placed", {
            tierTitle: tier?.title,
            bookTitle: book?.title,
            tierListId: listData.id,
          });
        }
      }
    }
  };

  const addRowWithUnsaved = (title?: string) => {
    addRow(title);
    setHasUnsavedChanges(true);
    apiTrackEvent("tier_create", {
      tierTitle: title || "Новый тир",
      tierListId: listData.id,
    });
  };

  const updateTierSettingsWithUnsaved = (
    tierId: string,
    settings: Partial<Tier>,
  ) => {
    updateTierSettings(tierId, settings);
    setHasUnsavedChanges(true);
  };

  const renameTierWithUnsaved = (tierId: string, newTitle: string) => {
    renameTier(tierId, newTitle);
    setHasUnsavedChanges(true);
    apiTrackEvent("tier_rename", {
      tierTitle: newTitle,
      tierListId: listData.id,
    });
  };

  const removeTierWithUnsaved = (tierId: string) => {
    removeTier(tierId);
    setHasUnsavedChanges(true);
  };

  const handleConfirmClearAll = () => {
    clearRows();
    setHasUnsavedChanges(true);
    setIsClearAllModalOpen(false);
  };

  const handleConfirmDeleteRating = async () => {
    if (isDemo) {
      clearDemo();
      navigate("/");
      return;
    }
    await deleteRatingFromServer();
    setShowDeleteRatingModal(false);
  };

  const handleMyRatingsClick = () => {
    navigate(isAuthenticated ? "/dashboard" : "/");
  };

  const handleViewBook = (book: Book) => {
    const target = getBookViewAction(book, effectiveTierListId, isReadOnly);
    if (target.type === "navigate") {
      navigate(target.path);
      return;
    }
    setBookToView(book);
  };

  // Логика блокировщика перехода (в демо-режиме не блокируем)
  const { handleConfirmLeave: handleConfirmLeaveBase, handleSaveBeforeLeave, handleCancelLeave } =
    useTierEditorBlocker({
      isReadOnly: isReadOnly || isDemo,
      ignoreUnsavedBlocker,
      hasUnsavedChanges,
      saveStatus,
      isUpdatingBook,
      setShowUnsavedModal,
      setIgnoreUnsavedBlocker,
      setDeletedTierIds,
      setIsSavingBeforeLeave,
      forceSave: handleSave,
      navigate,
      logger,
      sileo,
    });

  // Обёртка: при «Выйти без сохранения» очищаем pending deletes БЕЗ flush на сервер
  const handleConfirmLeave = useCallback(() => {
    cancelPendingDeletes();
    handleConfirmLeaveBase();
  }, [cancelPendingDeletes, handleConfirmLeaveBase]);

  // Получаем D&D логику из хука
  const {
    tierGridRef,
    handleDragStart,
    handleDragOver,
    handleDragEndAndClear,
    onDownloadImage,
  } = useTierEditorDrag({
    listData,
    setActiveItem,
    handleDragEndWithUnsaved,
  });

  // При первом перетаскивании — завершаем онбординг (и помечаем просмотренным)
  const wrappedHandleDragStart = useCallback(
    (event: Parameters<typeof handleDragStart>[0]) => {
      handleDragStart(event);
      if (onboardingStep !== null) {
        handleOnboardingSkip();
      }
    },
    [handleDragStart, onboardingStep, handleOnboardingSkip],
  );

  const handleConfirmDelete = () => {
    if (tierToDelete) removeTierWithUnsaved(tierToDelete);
    setTierToDelete(null);
  };

  const handleConfirmDeleteBook = () => {
    if (bookToDelete) deleteBookWithUnsaved(bookToDelete);
    setBookToDelete(null);
  };

  // Пропсы для EditorHeader
  const headerProps: import("./components/EditorHeader").EditorHeaderProps = {
    title: listData.title,
    isDemo,
    onBackClick: handleMyRatingsClick,
    ...(isReadOnly && {
      author: apiData?.user,
      likesCount: likesData?.likesCount || 0,
      initialLiked: likesData?.isLiked || false,
      tierListId,
      ownerUserId,
      currentUserId,
      isReadOnly: true,
      isPublic,
      hideFork: fromBattle,
      coverImageUrl: displayCoverImageUrl,
      booksCount: Object.keys(listData.books).length,
    }),
  };

  const pageUrl = apiData?.slug || effectiveTierListId;
  const shareUrl = `${import.meta.env.VITE_SITE_URL || "https://bookstrata.ru"}/tier-lists/${pageUrl}`;

  /* Модальные окна — рендерятся внутри main[data-theme] через EditorLayout,
     чтобы наследовать токены текущей темы */
  const modals = (
    <>
      {/* Модалка регистрации при сохранении в демо-режиме */}
      <AuthOnSaveModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleDemoSaveSuccess}
        initialTitle={demoTitle}
        onTitleChange={setDemoTitle}
      />

      {/* Модалка шеринга при первом успешном сохранении тир-листа */}
      <ShareSuccessModal
        isOpen={showShareSuccessModal}
        onClose={() => setShowShareSuccessModal(false)}
        title={listData.title}
        coverImageUrl={displayCoverImageUrl || firstBookCoverUrl}
        booksCount={Object.keys(listData.books).length}
        onRoast={!isReadOnly ? handleRoastClick : undefined}
        shareUrl={
          firstCreatedSharePath
            ? `${import.meta.env.VITE_SITE_URL || "https://bookstrata.ru"}${firstCreatedSharePath}`
            : shareUrl
        }
      />

      {/* Модалка прожарки тир-листа */}
      <TierListRoastModal
        isOpen={isRoastModalOpen}
        onClose={() => setIsRoastModalOpen(false)}
        tierListTitle={listData.title}
        tierListDescription={tierListDescription}
        tiers={orderedTiers}
        books={listData.books}
        tierListId={effectiveTierListId}
      />

      {/* Модальные окна */}
      <EditorModals
        tierToDelete={tierToDelete}
        bookToDelete={bookToDelete}
        isClearAllModalOpen={isClearAllModalOpen}
        showUnsavedModal={showUnsavedModal}
        showDeleteRatingModal={showDeleteRatingModal}
        bookToEdit={bookToEdit}
        bookToView={bookToView}
        isSearchModalOpen={isSearchModalOpen}
        tierListId={effectiveTierListId}
        listData={listData}
        onCloseDeleteTier={() => setTierToDelete(null)}
        onCloseDeleteBook={() => setBookToDelete(null)}
        onCloseClearAll={() => setIsClearAllModalOpen(false)}
        onCloseUnsaved={handleCancelLeave}
        onCloseDeleteRating={() => setShowDeleteRatingModal(false)}
        onCloseEditBook={() => setBookToEdit(null)}
        onCloseViewBook={() => setBookToView(null)}
        onCloseSearch={() => setIsSearchModalOpen(false)}
        onConfirmDeleteTier={handleConfirmDelete}
        onConfirmDeleteBook={handleConfirmDeleteBook}
        onConfirmClearAll={handleConfirmClearAll}
        onConfirmDeleteRating={handleConfirmDeleteRating}
        onConfirmLeave={handleConfirmLeave}
        onSaveAndLeave={handleSaveBeforeLeave}
        onSaveBook={handleSaveBook}
        onUploadBooks={handleUploadBooks}
        onBookAdded={handleBookAdded}
        isSavingBeforeLeave={isSavingBeforeLeave}
        isUpdatingBook={isUpdatingBook}
        isExportModalOpen={isExportModalOpen}
        onCloseExport={() => setIsExportModalOpen(false)}
        onConfirmExport={async (options) => {
          if (hasUnsavedChanges && !isDemo) {
            try {
              await handleSave();
            } catch {
              // Ошибка сохранения — не блокируем экспорт
            }
          }
          await onDownloadImage(authUser?.username, options);
        }}
        username={authUser?.username || "user"}
        isReadOnly={isReadOnly}
        localMode={!createdTierListId && tierListId === "new"}
        tierListTheme={displayTheme}
        onRequireAuth={openDemoAuthModal}
      />

      {/* Онбординг демо-режима — внутри main[data-theme], наследует токены темы */}
      {onboardingStep !== null && (
        <DemoOnboarding
          step={onboardingStep}
          onNext={handleOnboardingNext}
          onSkip={handleOnboardingSkip}
          tierNames={listData.tierOrder
            .map((id) => listData.tiers[id]?.title)
            .filter((t): t is string => !!t)}
        />
      )}
    </>
  );

  const jsonLd = isPublic && apiData ? buildTierListJsonLd(listData, apiData, pageUrl) : null;
  const placedBooksCount = listData.tierOrder.reduce(
    (sum, id) => sum + (listData.tiers[id]?.bookIds.length ?? 0),
    0,
  );
  const hasDescription = Boolean(apiData?.description?.trim());
  const hasThoughts = Object.values(listData.books).some((b) =>
    Boolean(b.thoughts?.trim()),
  );
  const safeAuthorUsername =
    sanitizePublicAuthorName(apiData?.user?.username) ?? undefined;

  return (
    <>
      {/* Не рендерим SEOHead пока грузятся данные — чтобы избежать пустых мета-тегов */}
      {isLoading && !apiData ? null : (
        <SEOHead
          title={buildTierListSeoTitle(
            apiData?.title,
            apiData?.user?.username,
            Object.keys(listData.books).length,
          )}
          description={
            apiData?.description ||
            buildTierListSeoDescription(
              apiData?.title,
              apiData?.user?.username,
              Object.keys(listData.books).length,
              (() => {
                const firstTierId = listData.tierOrder[0];
                const firstTier = firstTierId ? listData.tiers[firstTierId] : undefined;
                const ids =
                  firstTier?.bookIds?.length
                    ? firstTier.bookIds
                    : Object.keys(listData.books);
                return ids
                  .slice(0, 3)
                  .map((id) => listData.books[id]?.title)
                  .filter((t): t is string => !!t);
              })(),
            )
          }
          url={`/tier-lists/${pageUrl}`}
          image={
            (displayCoverImageUrl || firstBookCoverUrl) &&
            !(displayCoverImageUrl || firstBookCoverUrl)!.includes("encrypted-tbn0.gstatic.com")
              ? (displayCoverImageUrl || firstBookCoverUrl)!
              : undefined
          }
          publishedTime={apiData?.createdAt ?? apiData?.updatedAt}
          dateModified={apiData?.updatedAt}
          author={safeAuthorUsername}
          type="article"
          noindex={
            shouldNoindexTierList(
              tierListId,
              isPublic,
              placedBooksCount,
              apiData?.title,
              { hasDescription, hasThoughts },
            )
          }
          breadcrumbs={[
            { name: "Главная", url: "/" },
            { name: "Тир-листы", url: "/templates" },
            {
              name: apiData?.title || "Тир-лист",
              url: `/tier-lists/${pageUrl}`,
            },
          ]}
        />
      )}

      {/* ItemList + Book JSON-LD для публичных тир-листов (SEO) */}
      {jsonLd && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>
      )}

      <EditorScreens
        isLoading={isLoading}
        isError={isError}
        error={error}
        onMyRatingsClick={handleMyRatingsClick}
      >
        <EditorLayout
          activeItem={activeItem}
          onDragStart={wrappedHandleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEndAndClear}
          onDragCancel={() => setActiveItem(null)}
          headerProps={headerProps}
          onMyRatingsClick={handleMyRatingsClick}
          isReadOnly={isReadOnly}
          isStreamMode={isStreamMode}
          tierListId={effectiveTierListId}
          coverImageUrl={displayCoverImageUrl}
          hideCover={fromBattle}
          theme={normalizedDisplayTheme}
          booksCount={Object.keys(listData.books).length}
          description={tierListDescription}
          onDescriptionChange={setTierListDescription}
          onCoverUpdated={setUserCoverOverride}
          onThemeChanged={handleThemeChanged}
          ownerUserId={ownerUserId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          breadcrumbItems={[
            { label: "Тир-листы", href: "/templates" },
            { label: apiData?.title || "Тир-лист" },
          ]}
        >
          {/* TasteMatchBanner и AI-промпт — скрыты в стрим-режиме */}
          {!isStreamMode && (
            <>
              <TasteMatchBanner
                apiData={apiData}
                isReadOnly={isReadOnly}
                authorUsername={safeAuthorUsername}
              />

              {/* Приветственный промпт AI — один раз при добавлении 3+ книг */}
              {!isReadOnly && Object.keys(listData.books).length >= 3 && (
                <AiRecommendationPrompt
                  totalBooks={Object.keys(listData.books).length}
                  onOpenAiLibrarian={handleAiLibrarianOpen}
                />
              )}
            </>
          )}

          <>
          {isReadOnly && tierListDescription && (
            <div className="mb-4 px-1">
              <p className="text-sm text-(--theme-text-muted) leading-relaxed whitespace-pre-line">
                {tierListDescription}
              </p>
            </div>
          )}
          <EditorMainContent
            listData={listData}
            isReadOnly={isReadOnly}
            isDemo={isDemo}
            isStreamMode={isStreamMode}
            tierGridRef={tierGridRef}
            hideUnranked={fromBattle}
            onDeleteBook={setBookToDelete}
            onEditBook={(book) => setBookToEdit(book)}
            onViewBook={handleViewBook}
            activeTierId={activeTierId}
            onAddRow={addRowWithUnsaved}
            onChangeTierColor={(tierId, color) =>
              updateTierSettingsWithUnsaved(tierId, { color })
            }
            onRenameTier={renameTierWithUnsaved}
            onDeleteTier={setTierToDelete}
            onSetActiveTier={(id) =>
              setActiveTierId((current) => (current === id ? null : id))
            }
            onUpdateTier={updateTierSettingsWithUnsaved}
            onClearRows={() => setIsClearAllModalOpen(true)}
            onDownloadImage={() => setIsExportModalOpen(true)}
            onRoast={!isReadOnly ? handleRoastClick : undefined}
            shareUrl={shareUrl}
            title={listData.title}
            isPublic={isPublic}
            onTogglePublic={togglePublic}
            isTogglingPublic={isTogglingPublic}
            onFindBook={() => setIsSearchModalOpen(true)}
            saveStatus={saveStatus}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={handleSaveOrRegister}
            onboardingStep={onboardingStep}
            onToggleStreamMode={() =>
              setIsStreamMode(!isStreamMode)
            }
          />

          {!isStreamMode && effectiveTierListId && effectiveTierListId !== "new" && (
            <SimilarTierListsCarousel tierListId={effectiveTierListId} initialSimilar={apiData?.similar} />
          )}

          {isReadOnly && !isStreamMode && (
            <TierListTextBreakdown
              title={apiData?.title || listData.title}
              authorName={apiData?.user?.username}
              listData={listData}
              onViewBook={handleViewBook}
            />
          )}
        </>

          {/* Модалки внутри main[data-theme] — наследуют токены темы */}
          {modals}
        </EditorLayout>

        {/* Режим стрим: кнопка выхода в углу экрана */}
        {isStreamMode && (
          <StreamModeExitButton onExit={() => setIsStreamMode(false)} />
        )}

        {!isReadOnly && (
          <AiLibrarianModal
            isOpen={isAiLibrarianOpen}
            onClose={handleAiLibrarianClose}
            context={{
              pageType: "tier-list",
              ...(effectiveTierListId && effectiveTierListId !== "new"
                ? { tierListId: effectiveTierListId }
                : {}),
            }}
            variant="sidebar"
          />
        )}

          {/* Плавающий виджет Букстража — скрыт в стрим-режиме, поднят над SupportWidget */}
          {!isReadOnly && !isStreamMode && (
          <div className="fixed right-6 max-md:right-4 z-50 bottom-36 md:bottom-24">
            <AiLibrarianWidget onClick={handleAiLibrarianOpen} theme={normalizedDisplayTheme} />
          </div>
        )}
      </EditorScreens>
    </>
  );
};

// Главный компонент с key для сброса состояния при смене tierListId
export default function TierListEditorPage() {
  const { id: tierListId = "" } = useParams<{ id: string }>();
  return <TierListEditorContent key={tierListId} />;
}
