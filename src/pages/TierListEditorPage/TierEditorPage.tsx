import "./ExportThemes.css";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { sileo } from "sileo";
import type { DragEndEvent } from "@dnd-kit/core";
import { useTierList } from "@/hooks/useTierList";
import type { Action } from "@/hooks/useTierList";
import { useAuth } from "@/hooks/useAuthContext";
import { createLogger } from "@/lib/logger";
import { EditorModals } from "./components/EditorModals";
import { EditorLayout } from "./components/EditorLayout";
import { EditorMainContent } from "./components/EditorMainContent";
import { EditorScreens } from "./components/EditorScreens";
import { useTierEditorActions } from "./hooks/useTierEditorActions";
import { useTierEditorState } from "./hooks/useTierEditorState";
import { useTierEditorQueries } from "./hooks/useTierEditorQueries";
import { useTierEditorDrag } from "./hooks/useTierEditorDrag";
import { useTierEditorBlocker } from "./hooks/useTierEditorBlocker";
import { useTierEditorSave } from "./hooks/useTierEditorSave";
import { TasteMatchBanner } from "@/components/TasteMatchBanner/TasteMatchBanner";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { AiLibrarianWidget } from "@/components/AiLibrarian/AiLibrarianWidget";
import { AiRecommendationPrompt } from "@/components/AiLibrarian/AiRecommendationPrompt";
import { useNsfwCheck } from "@/hooks/useNsfwCheck";
import { NsfwWarning } from "@/components/NsfwWarning/NsfwWarning";
import { apiCreateFlag } from "@/lib/moderationApi";
import type { NsfwResult } from "@/hooks/useNsfwCheck";
import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/SEO/SEOHead";

import { useDemoStorage } from "./hooks/useDemoStorage";
import { AuthOnSaveModal } from "./components/AuthOnSaveModal";
import "./TierEditorPage.css";
import type { Book, Tier, TierListData } from "@/types";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

type PendingDeletedBook = {
  book: Book;
  containerId: string | null;
  index: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

const DELETE_UNDO_DURATION_MS = 3000;

// Логгер для страницы редактора
const logger = createLogger("TierEditorPage", { color: "green" });

// Внутренний компонент с ключом для автоматического сброса состояния
const TierListEditorContent = () => {
  const { id: tierListId = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const fromBattle = searchParams.get("context") === "battle";
  const forkSlug = searchParams.get("fork");
  const forkReadIds = useMemo(() => {
    const raw = searchParams.get("readIds");
    return raw ? raw.split(",").filter(Boolean) : null;
  }, [searchParams]);
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
  } = useTierEditorState();

  // Получаем данные и настройки пользователя
  const { user: authUser, isAuthenticated } = useAuth();

  // Получаем данные через React Query
  const {
    isLoading,
    isError,
    error,
    apiData,
    likesData,
    isPublic,
    initialDataForHook,
  } = useTierEditorQueries(tierListId, forkSlug, forkReadIds);

  // Переопределения от пользователя (null = не менял, берём из apiData)
  const [userCoverOverride, setUserCoverOverride] = useState<string | null>(null);
  const [userThemeOverride, setUserThemeOverride] = useState<string | null>(null);

  const displayCoverImageUrl = userCoverOverride !== null ? userCoverOverride : (apiData?.coverImageUrl ?? null);
  const displayTheme = userThemeOverride !== null ? userThemeOverride : (apiData?.theme ?? "default");

  const [isAiLibrarianOpen, setAiLibrarianOpen] = useState(false);

  const handleAiLibrarianOpen = useCallback(() => setAiLibrarianOpen(true), []);
  const handleAiLibrarianClose = useCallback(() => setAiLibrarianOpen(false), []);

  const [bookNsfwState, setBookNsfwState] = useState<{
    checking: boolean;
    result: NsfwResult | null;
    pendingFiles: File[] | null;
  }>({ checking: false, result: null, pendingFiles: null })
  const { checkImage } = useNsfwCheck()

  // Заменяем UUID на slug в URL после загрузки данных
  useEffect(() => {
    if (apiData?.slug && isUuid(tierListId)) {
      window.history.replaceState(null, "", `/tier-lists/${apiData.slug}`);
    }
  }, [apiData?.slug, tierListId])

  // Извлекаем ID владельца и текущего пользователя
  const ownerUserId = apiData?.user?.id;
  const currentUserId = authUser?.userId;
  const isOwner = currentUserId === ownerUserId;

  // Режим просмотра (если не владелец и список публичный)
  const isReadOnly = !isOwner && isPublic;

  // ========== ДЕМО-РЕЖИМ (часть 1: инициализация) ==========
  const isDemo = tierListId === "new" && !isAuthenticated;
  const { loadDemo, saveDemo, clearDemo } = useDemoStorage();

  // Если есть сохранённый черновик в localStorage — используем его (для демо и после регистрации)
  const [demoInitialData] = useState<TierListData | null>(() => {
    if (tierListId === "new") return loadDemo() ?? null;
    return null;
  });

  const effectiveInitialData = demoInitialData ?? initialDataForHook;

  // Состояние для модалки регистрации (используется в части 2)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [demoTitle, setDemoTitle] = useState(initialDataForHook.title || "Новый тир-лист");
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
        title: 'Черновик восстановлен',
        description: 'Вы можете продолжить редактирование и сохранить тир-лист',
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

  // ========== ОПТИМИЗИРОВАННОЕ АВТОСОХРАНЕНИЕ ==========
  const {
    saveStatus,
    lastSaved,
    handleSave,
  } = useTierEditorSave({
    tierListId,
    listData,
    dispatch: dispatch as React.Dispatch<Action>,
    isLoading,
    isReadOnly,
    setHasUnsavedChanges,
    logger,
    theme: displayTheme,
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

    // Шаг 3: после того как React обработает dispatch (название применится),
    // запускаем сохранение на сервер. Используем setTimeout, чтобы гарантировать,
    // что handleSave прочитает уже обновлённый listData.title.
    setTimeout(async () => {
      const saved = await handleSaveRef.current();
      if (saved) {
        clearDemo();
      }
    }, 50);
  }, [demoTitle, dispatch, clearDemo]);

  // Автосохранение по таймеру (каждые 30 сек) — не в демо-режиме
  useEffect(() => {
    if (isReadOnly || !tierListId || isDemo) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges && saveStatus !== "saving") {
        handleSave();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [handleSave, isReadOnly, hasUnsavedChanges, saveStatus, tierListId, isDemo]);
  // ========== КОНЕЦ АВТОСОХРАНЕНИЯ ==========

  // Перехват сохранения: в демо-режиме открываем регистрацию, иначе стандартный save
  const handleSaveOrRegister = useCallback(async () => {
    if (isDemo) {
      setDemoTitle(listData.title || "Новый тир-лист");
      setShowAuthModal(true);
    } else {
      // При сохранении с "new" на сервер — чистим localStorage от демо-данных
      await handleSave();
      if (tierListId === "new") {
        clearDemo();
      }
    }
  }, [isDemo, listData.title, handleSave, tierListId, clearDemo]);

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
          logger.info("Ctrl+S pressed with no unsaved changes, prevented default");
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
    onRequireAuth: () => setShowAuthModal(true),
  });

  const processBookFiles = useCallback(async (files: File[]) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30 MB

    // Проверяем каждый файл
    const tooBig = files.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      sileo.error({
        title: "Файл слишком большой",
        description: `«${tooBig.name}» больше 5 MB. Максимум 5 MB на одну обложку.`,
      });
      return;
    }

    // Проверяем суммарный размер
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      sileo.error({
        title: "Слишком большой общий объём",
        description: `Общий размер файлов (${(totalSize / 1024 / 1024).toFixed(1)} MB) превышает лимит 30 MB.`,
      });
      return;
    }

    // Собираем existingKeys заранее, чтобы не показывать тост на дубликаты
    const existingKeys = new Set(
      Object.values(listData.books).map(
        (b) => `${b.title.toLowerCase()}|${(b.author || "").toLowerCase()}`,
      ),
    );

    let addedCount = 0;
    for (const file of files) {
      const title = file.name.replace(/\.[^/.]+$/, "");
      const author = "Неизвестен";
      const key = `${title.toLowerCase()}|${author.toLowerCase()}`;

      // Пропускаем дубликаты
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      const coverImageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const bookId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch({
        type: "ADD_BOOKS",
        payload: {
          newBooks: [
            {
              id: bookId,
              title,
              author,
              coverImageUrl,
            },
          ],
        },
      });
      setHasUnsavedChanges(true);
      addedCount++;
    }

    if (addedCount === 0) {
      if (files.length === 1) {
        sileo.info({
          title: "Книга уже добавлена",
          description: "Эта книга уже есть в тир-листе",
          duration: 2500,
        });
      } else {
        const d = files.length % 10;
        const dd = files.length % 100;
        const w = d === 1 && dd !== 11 ? 'книга'
          : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'книги'
          : 'книг';
        sileo.info({
          title: "Книги уже добавлены",
          description: `Все ${files.length} ${w} уже есть в тир-листе`,
          duration: 2500,
        });
      }
      return;
    }

    const skipped = files.length - addedCount;
    const n = addedCount;
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    const prefix = lastDigit === 1 && lastTwoDigits !== 11 ? "Загружена" : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? "Загружены" : "Загружено";
    const word = lastDigit === 1 && lastTwoDigits !== 11 ? "книга" : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? "книги" : "книг";
    const title = skipped > 0
      ? `${prefix} ${n} ${word} (${skipped} ${skipped === 1 ? 'уже была' : 'уже были'})`
      : `${prefix} ${n} ${word}`;
    sileo.success({
      title,
      duration: 3000,
    });
  }, [dispatch, setHasUnsavedChanges, listData.books])

  const handleUploadBooks = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    setBookNsfwState({ checking: true, result: null, pendingFiles: files })

    try {
      const results = await Promise.all(files.map((f) => checkImage(f)))
      const nsfwResult = results.find((r) => r.isNsfw)

      if (nsfwResult) {
        setBookNsfwState({ checking: false, result: nsfwResult, pendingFiles: files })
        return
      }

      setBookNsfwState({ checking: false, result: null, pendingFiles: null })
      await processBookFiles(files)
    } catch {
      setBookNsfwState({ checking: false, result: null, pendingFiles: null })
      await processBookFiles(files)
    }
  }, [checkImage, processBookFiles])

  const handleBookNsfwOverride = useCallback(() => {
    if (bookNsfwState.pendingFiles) {
      const maxScore = bookNsfwState.result
        ? Math.max(...bookNsfwState.result.predictions.map((p) => p.probability))
        : null
      apiCreateFlag({
        imageUrl: bookNsfwState.pendingFiles[0]?.name ?? "unknown",
        flagType: "book-cover",
        targetId: tierListId,
        nsfwScore: maxScore,
      }).catch(() => {})
      processBookFiles(bookNsfwState.pendingFiles)
    }
    setBookNsfwState({ checking: false, result: null, pendingFiles: null })
  }, [bookNsfwState.pendingFiles, bookNsfwState.result, processBookFiles, tierListId])

  const handleBookNsfwDismiss = useCallback(() => {
    setBookNsfwState({ checking: false, result: null, pendingFiles: null })
  }, [])

  const pendingDeletedBooksRef = useRef<Map<string, PendingDeletedBook>>(
    new Map(),
  );

  // Обработчики с установкой hasUnsavedChanges
  const handleDragEndWithUnsaved = (event: DragEndEvent) => {
    const changed = handleDragEnd(event);
    if (changed) setHasUnsavedChanges(true);
  };

  const getBookPlacement = (bookId: string) => {
    for (const tierId of listData.tierOrder) {
      const tier = listData.tiers[tierId];
      const index = tier?.bookIds.indexOf(bookId) ?? -1;

      if (index >= 0) {
        return {
          containerId: tierId,
          index,
        };
      }
    }

    const unrankedIndex = listData.unrankedBookIds.indexOf(bookId);
    if (unrankedIndex >= 0) {
      return {
        containerId: null,
        index: unrankedIndex,
      };
    }

    return {
      containerId: null,
      index: listData.unrankedBookIds.length,
    };
  };

  const undoDeleteBook = (bookId: string) => {
    const pendingDeletedBook = pendingDeletedBooksRef.current.get(bookId);
    if (!pendingDeletedBook) return;

    clearTimeout(pendingDeletedBook.timeoutId);
    pendingDeletedBooksRef.current.delete(bookId);
    restoreBook(
      pendingDeletedBook.book,
      pendingDeletedBook.containerId,
      pendingDeletedBook.index,
    );
    setHasUnsavedChanges(true);

    sileo.success({
      title: "Удаление отменено",
      duration: 2500,
    });
  };

  const deleteBookWithUnsaved = (bookId: string) => {
    const book = listData.books[bookId];
    if (!book) return;

    const placement = getBookPlacement(bookId);
    deleteBook(bookId);
    setHasUnsavedChanges(true);

    const timeoutId = setTimeout(() => {
      const pendingDeletedBook = pendingDeletedBooksRef.current.get(bookId);
      if (!pendingDeletedBook) return;

      pendingDeletedBooksRef.current.delete(bookId);
      handleDeleteBook(bookId, {
        showSuccessToast: false,
        onError: () => {
          restoreBook(
            pendingDeletedBook.book,
            pendingDeletedBook.containerId,
            pendingDeletedBook.index,
          );
          setHasUnsavedChanges(true);
        },
      });
    }, DELETE_UNDO_DURATION_MS);

    pendingDeletedBooksRef.current.set(bookId, {
      book,
      containerId: placement.containerId,
      index: placement.index,
      timeoutId,
    });

    sileo.action({
      title: "Книга удалена",
      description: `Удалили "${book.title}"`,
      duration: DELETE_UNDO_DURATION_MS,
      button: {
        title: "Отменить",
        onClick: () => undoDeleteBook(bookId),
      },
    });
  };

  const addRowWithUnsaved = () => {
    addRow();
    setHasUnsavedChanges(true);
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
      navigate('/');
      return;
    }
    await deleteRatingFromServer();
    setShowDeleteRatingModal(false);
  };

  const handleMyRatingsClick = () => {
    navigate(isAuthenticated ? "/dashboard" : "/");
  };

  const handleViewBook = (book: Book) => {
    setBookToView(book);
  };

  // Логика блокировщика перехода (в демо-режиме не блокируем)
  const { handleConfirmLeave, handleSaveBeforeLeave, handleCancelLeave } =
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
    ...(isReadOnly && {
      author: apiData?.user,
      likesCount: likesData?.likesCount || 0,
      initialLiked: likesData?.isLiked || false,
      tierListId,
      ownerUserId,
      currentUserId,
      isReadOnly: true,
      hideFork: fromBattle,
      coverImageUrl: displayCoverImageUrl,
      booksCount: Object.keys(listData.books).length,
    }),
  };

  const pageUrl = apiData?.slug || tierListId;
  const shareUrl = `${import.meta.env.VITE_SITE_URL || "https://bookstrata.ru"}/tier-lists/${pageUrl}`;

  return (
    <>
      {/* Не рендерим SEOHead пока грузятся данные — чтобы избежать пустых мета-тегов */}
      {(isLoading && !apiData) ? null : (
        <SEOHead
          title={apiData?.title ? `${apiData.title} — книжный тир-лист` : "Книжный тир-лист"}
          description={apiData?.title ? `Тир-лист «${apiData.title}» — визуальный рейтинг книг, созданный на BookStrata` : "Книжный тир-лист на BookStrata — рейтинг книг по уровням"}
          url={`/tier-lists/${pageUrl}`}
          image={apiData?.coverImageUrl || undefined}
          publishedTime={apiData?.updatedAt}
          type="article"
          noindex={apiData ? !isPublic : undefined}
          breadcrumbs={[
            { name: "Главная", url: "/" },
            { name: "Тир-листы", url: "/templates" },
            { name: apiData?.title || "Тир-лист", url: `/tier-lists/${pageUrl}` },
          ]}
        />
      )}

      {/* ItemList + Book JSON-LD для публичных тир-листов (SEO) */}
      {isPublic && apiData && Object.keys(listData.books).length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: apiData.title,
              description: `Тир-лист «${apiData.title}» — визуальный рейтинг книг, созданный на BookStrata`,
              url: `${import.meta.env.VITE_SITE_URL || "https://bookstrata.ru"}/tier-lists/${pageUrl}`,
              author: apiData.user
                ? { "@type": "Person", name: apiData.user.username || "Anonymous" }
                : undefined,
              itemListElement: listData.tierOrder
                .map((tierId) => {
                  const tier = listData.tiers[tierId];
                  if (!tier) return [];
                  return tier.bookIds
                    .map((bookId, index) => {
                      const book = listData.books[bookId];
                      if (!book) return null;
                      return {
                        "@type": "ListItem",
                        position: index + 1,
                        item: {
                          "@type": "Book",
                          name: book.title,
                          author: book.author
                            ? { "@type": "Person", name: book.author }
                            : undefined,
                          ...(book.coverImageUrl
                            ? { image: book.coverImageUrl }
                            : {}),
                          ...(book.description
                            ? { description: book.description }
                            : {}),
                          position: tier.title,
                        },
                      };
                    })
                    .filter(Boolean);
                })
                .flat(),
            })}
          </script>
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
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndAndClear}
        onDragCancel={() => setActiveItem(null)}
        headerProps={headerProps}
        onMyRatingsClick={handleMyRatingsClick}
        isReadOnly={isReadOnly}
        tierListId={tierListId}
        coverImageUrl={displayCoverImageUrl}
        hideCover={fromBattle}
        theme={displayTheme}
        booksCount={Object.keys(listData.books).length}
        onCoverUpdated={setUserCoverOverride}
        onThemeChanged={setUserThemeOverride}
        ownerUserId={ownerUserId}
        currentUserId={currentUserId}
        breadcrumbItems={[
          { label: "Тир-листы", href: "/templates" },
          { label: apiData?.title || "Тир-лист" },
        ]}
      >
        <TasteMatchBanner
          apiData={apiData}
          isReadOnly={isReadOnly}
          authorUsername={apiData?.user?.username}
        />

        {/* Приветственный промпт AI — один раз при добавлении 3+ книг */}
        {!isReadOnly && Object.keys(listData.books).length >= 3 && (
          <AiRecommendationPrompt
            totalBooks={Object.keys(listData.books).length}
            onOpenAiLibrarian={handleAiLibrarianOpen}
          />
        )}

        <EditorMainContent
          listData={listData}
          isReadOnly={isReadOnly}
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
          shareUrl={shareUrl}
          title={listData.title}
          onDeleteRating={() => setShowDeleteRatingModal(true)}
          isPublic={isPublic}
          onTogglePublic={togglePublic}
          isTogglingPublic={isTogglingPublic}
          onFindBook={() => setIsSearchModalOpen(true)}
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
            onSave={handleSaveOrRegister}
        />

      </EditorLayout>

      {/* Модалка регистрации при сохранении в демо-режиме */}
      <AuthOnSaveModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleDemoSaveSuccess}
        initialTitle={demoTitle}
        onTitleChange={setDemoTitle}
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
        tierListId={tierListId}
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
        onConfirmExport={async (exportTheme) => {
          if (hasUnsavedChanges && !isDemo) {
            try {
              await handleSave();
            } catch {
              // Ошибка сохранения — не блокируем экспорт
            }
          }
          onDownloadImage(exportTheme, authUser?.username);
        }}
        username={authUser?.username || "user"}
        isReadOnly={isReadOnly}
        localMode={isDemo}
        tierListTheme={displayTheme}
        onRequireAuth={() => setShowAuthModal(true)}
      />

      {!isReadOnly && (
        <AiLibrarianModal
          isOpen={isAiLibrarianOpen}
          onClose={handleAiLibrarianClose}
          variant="sidebar"
        />
      )}

      {/* Плавающий виджет Букстража — заменяет FeedbackButton на странице редактора */}
      {!isReadOnly && (
        <div className="fixed right-6 z-50 bottom-[80px] md:bottom-6">
          <AiLibrarianWidget onClick={handleAiLibrarianOpen} />
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
        <NsfwWarning
          isChecking={bookNsfwState.checking}
          isNsfw={bookNsfwState.result?.isNsfw ?? false}
          predictions={bookNsfwState.result?.predictions}
          onOverride={handleBookNsfwOverride}
          onDismiss={handleBookNsfwDismiss}
        />
      </div>
    </EditorScreens>
    </>
  );
};

// Главный компонент с key для сброса состояния при смене tierListId
export default function TierListEditorPage() {
  const { id: tierListId = "" } = useParams<{ id: string }>();
  return <TierListEditorContent key={tierListId} />;
};
