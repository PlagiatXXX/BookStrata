import type { ReactNode } from "react";
import type { ThemeConfig } from "./types";
import { ThemeContext } from "./useTheme";

interface ThemeProviderProps {
  theme: ThemeConfig | null;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  if (!theme) return <>{children}</>;

  const style = {
    "--theme-bg": theme.tokens.colors.background,
    "--theme-surface": theme.tokens.colors.surface,
    "--theme-surface-high": theme.tokens.colors.surfaceHigh,
    "--theme-on-surface": theme.tokens.colors.onSurface,
    "--theme-on-surface-variant": theme.tokens.colors.onSurfaceVariant,
    "--theme-primary": theme.tokens.colors.primary,
    "--theme-primary-container": theme.tokens.colors.primaryContainer,
    "--theme-on-primary-container": theme.tokens.colors.onPrimaryContainer,
    "--theme-secondary": theme.tokens.colors.secondary,
    "--theme-secondary-container": theme.tokens.colors.secondaryContainer,
    "--theme-on-secondary-container": theme.tokens.colors.onSecondaryContainer,
    "--theme-outline": theme.tokens.colors.outline,
    "--theme-outline-variant": theme.tokens.colors.outlineVariant,
    "--theme-ink": theme.tokens.colors.ink,
    "--theme-parchment": theme.tokens.colors.parchment,
    "--theme-aged": theme.tokens.colors.aged,
    "--theme-font-headline": theme.tokens.typography.headlineFont,
    "--theme-font-headline-weight": theme.tokens.typography.headlineWeight,
    "--theme-font-body": theme.tokens.typography.bodyFont,
    "--theme-font-label": theme.tokens.typography.labelFont,
    "--theme-radius-sm": theme.tokens.borderRadius.sm,
    "--theme-radius-md": theme.tokens.borderRadius.md,
    "--theme-radius-lg": theme.tokens.borderRadius.lg,
    "--theme-radius-xl": theme.tokens.borderRadius.xl,
    background: theme.tokens.colors.background,
    minHeight: "100%",
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value={{ theme }}>
      <div className="theme-container" style={style}>
        {/* Texture overlay */}
        <div
          className="theme-texture-overlay"
          style={{
            backgroundImage: `url("${theme.tokens.texture.svg}")`,
            opacity: theme.tokens.texture.opacity,
          }}
        />
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
