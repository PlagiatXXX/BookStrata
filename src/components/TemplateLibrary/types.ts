import type { SectionKey } from './templateLibraryReducer';

// Re-export типов из reducer
export type {
  SectionKey,
  TemplateLibraryState,
  TemplateLibraryAction,
} from './templateLibraryReducer';

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
  viewMode: string;
  onViewModeChange: (mode: string) => void;
  onCreateClick: () => void;
}

// === Header Props ===
export interface TemplateLibraryHeaderProps {
  title: string;
  description: string;
  onBackClick?: () => void;
}