import type { Template } from '../../types/templates';
import type { TierListShort } from '@/lib/tierListApi';
import type { SectionKey, ViewMode } from './templateLibraryReducer';

// Re-export типов из reducer
export type {
  SectionKey,
  ViewMode,
  TemplateLibraryState,
  TemplateLibraryAction,
} from './templateLibraryReducer';

// === Template Card Props ===
export interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  viewMode: ViewMode;
  coverHeight?: number;
}

// === Public Tier List Card Props ===
export interface PublicTierListCardProps {
  tierList: TierListShort;
  isLiked: boolean;
  onLike?: (id: number) => void;
  onClick?: (id: number) => void;
}

// === Pagination Props ===
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isFetching: boolean;
}

// === Sidebar Props ===
export interface TemplateLibrarySidebarProps {
  activeSection: SectionKey;
  activeCategory: string;
  categories: string[];
  onSectionChange: (section: SectionKey) => void;
  onCategoryChange: (category: string) => void;
}

// === Toolbar Props ===
export interface TemplateLibraryToolbarProps {
  activeSection: SectionKey;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateClick: () => void;
}

// === Grid Props ===
export interface TemplateLibraryGridProps {
  templates: Template[];
  viewMode: ViewMode;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  coverHeights: number[];
}

// === Empty State Props ===
export interface EmptyStateProps {
  section: SectionKey;
  hasSearch: boolean;
  searchQuery: string;
}

// === Header Props ===
export interface TemplateLibraryHeaderProps {
  title: string;
  description: string;
  onBackClick: () => void;
}
