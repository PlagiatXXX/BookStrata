export interface ThemeTokens {
  colors: {
    background: string;
    surface: string;
    surfaceHigh: string;
    onSurface: string;
    onSurfaceVariant: string;
    primary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    outline: string;
    outlineVariant: string;
    ink: string;
    parchment: string;
    aged: string;
  };
  typography: {
    headlineFont: string;
    headlineWeight: string;
    bodyFont: string;
    labelFont: string;
  };
  texture: {
    svg: string;
    opacity: number;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export type SectionType =
  | "hero-split"
  | "hero-full"
  | "filter-chips"
  | "content-grid"
  | "category-blocks"
  | "tier-view"
  | "prose"
  | "description"
  | "sidebar";

export interface ThemeSidebarItem {
  icon: string;
  label: string;
}

export interface ThemeSidebar {
  title: string;
  description: string;
  items: ThemeSidebarItem[];
  cta?: {
    label: string;
    href: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  tokens: ThemeTokens;
  sections: SectionType[];
  sidebar?: ThemeSidebar;
  decor?: string;
}
