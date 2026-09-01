import { createContext, useContext } from "react";
import type { ThemeConfig } from "./types";

interface ThemeContextValue {
  theme: ThemeConfig;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeConfig | null {
  return useContext(ThemeContext)?.theme ?? null;
}
