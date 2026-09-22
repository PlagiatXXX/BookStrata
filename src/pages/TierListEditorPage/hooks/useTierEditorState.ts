import { useState, useCallback } from 'react';
import type { Book, Tier } from '@/types';

export interface TierEditorState {
  // Состояния для отслеживания несохраненных изменений
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  deletedTierIds: number[];
  setDeletedTierIds: React.Dispatch<React.SetStateAction<number[]>>;

  // Состояния модальных окон
  showUnsavedModal: boolean;
  setShowUnsavedModal: (value: boolean) => void;
  showDeleteRatingModal: boolean;
  setShowDeleteRatingModal: (value: boolean) => void;
  ignoreUnsavedBlocker: boolean;
  setIgnoreUnsavedBlocker: (value: boolean) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (value: boolean) => void;
  isSavingBeforeLeave: boolean;
  setIsSavingBeforeLeave: (value: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (value: boolean) => void;

  // D&D состояния
  activeItem: Book | Tier | null;
  setActiveItem: React.Dispatch<React.SetStateAction<Book | Tier | null>>;
  tierToDelete: string | null;
  setTierToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  bookToDelete: string | null;
  setBookToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  activeTierId: string | null;
  setActiveTierId: React.Dispatch<React.SetStateAction<string | null>>;
  isClearAllModalOpen: boolean;
  setIsClearAllModalOpen: (value: boolean) => void;
  bookToEdit: Book | null;
  setBookToEdit: React.Dispatch<React.SetStateAction<Book | null>>;
  bookToView: Book | null;
  setBookToView: React.Dispatch<React.SetStateAction<Book | null>>;

  // Режим стрим
  isStreamMode: boolean;
  setIsStreamMode: (value: boolean) => void;
}

const STREAM_MODE_KEY_PREFIX = "tier-editor-stream-mode-";

function readStreamMode(tierListId: string): boolean {
  try {
    return localStorage.getItem(`${STREAM_MODE_KEY_PREFIX}${tierListId}`) === "true";
  } catch {
    return false;
  }
}

export function useTierEditorState(tierListId?: string): TierEditorState {
  // Состояние для отслеживания несохраненных изменений
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deletedTierIds, setDeletedTierIds] = useState<number[]>([]);

  // Состояния модальных окон
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteRatingModal, setShowDeleteRatingModal] = useState(false);
  const [ignoreUnsavedBlocker, setIgnoreUnsavedBlocker] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // D&D состояния
  const [activeItem, setActiveItem] = useState<Book | Tier | null>(null);
  const [tierToDelete, setTierToDelete] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [activeTierId, setActiveTierId] = useState<string | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [bookToView, setBookToView] = useState<Book | null>(null);

  // Режим стрим: состояние + localStorage (инициализатор читает при первом рендере;
  // при навигации между тир-листами компонент ремаунтится и инициализатор запускается заново)
  const [isStreamMode, setIsStreamModeRaw] = useState(() =>
    tierListId ? readStreamMode(tierListId) : false,
  );

  const setIsStreamMode = useCallback(
    (value: boolean) => {
      setIsStreamModeRaw(value);
      if (tierListId) {
        try {
          if (value) {
            localStorage.setItem(`${STREAM_MODE_KEY_PREFIX}${tierListId}`, "true");
          } else {
            localStorage.removeItem(`${STREAM_MODE_KEY_PREFIX}${tierListId}`);
          }
        } catch {
          // localStorage недоступен — игнорируем
        }
      }
    },
    [tierListId],
  );

  return {
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
  };
}
