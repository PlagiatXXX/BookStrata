import type { ThemeConfig } from "./types";
import { autumnTheme } from "./themes/autumn";

const THEMES: Record<string, ThemeConfig> = {};

export function getThemeById(id: string): ThemeConfig | null {
  return THEMES[id] ?? null;
}

export function registerTheme(config: ThemeConfig): void {
  THEMES[config.id] = config;
}

// Register all themes
registerTheme(autumnTheme);

/** List all available themes for the admin dropdown */
export function listThemes(): Array<{ id: string; name: string }> {
  return Object.values(THEMES).map((t) => ({ id: t.id, name: t.name }));
}
