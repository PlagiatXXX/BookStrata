import type { TierListShort } from '@/lib/api';

// === Modal types ===
export type ModalType = 'create' | 'rename' | 'delete' | null;

// === Dashboard state ===
export interface DashboardState {
  currentPage: number;
  searchQuery: string;
  activeModal: ModalType;
  tierListToRename: TierListShort | null;
  tierListToDelete: TierListShort | null;
  renameTitle: string;
  createTitle: string;
}

// === Dashboard actions ===
export type DashboardAction =
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'OPEN_CREATE_MODAL' }
  | { type: 'OPEN_RENAME_MODAL'; payload: TierListShort }
  | { type: 'OPEN_DELETE_MODAL'; payload: TierListShort }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_RENAME_TITLE'; payload: string }
  | { type: 'SET_CREATE_TITLE'; payload: string }
  | { type: 'RESET_STATE' };

// === Component props ===
export interface DashboardHeaderProps {
  username: string;
  onCreateClick: () => void;
  onCommunityClick: () => void;
  onLogoutClick: () => void;
}

export interface TierListCardProps {
  tierList: TierListShort;
  onOpen: (id: number) => void;
  onRename: (tierList: TierListShort) => void;
  onDelete: (tierList: TierListShort) => void;
}

export interface TierListGridProps {
  tierLists: TierListShort[];
  onOpen: (id: number) => void;
  onRename: (tierList: TierListShort) => void;
  onDelete: (tierList: TierListShort) => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface EmptyStatesProps {
  isLoading: boolean;
  hasError: boolean;
  hasSearchQuery: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  onCreateClick: () => void;
  onClearSearch: () => void;
  error?: Error | null;
}

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
  createTitle: string;
  onTitleChange: (title: string) => void;
  isPending: boolean;
}

export interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  renameTitle: string;
  onTitleChange: (title: string) => void;
  isPending: boolean;
  tierListTitle?: string;
}

export interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  tierListTitle?: string;
  isPending: boolean;
}
