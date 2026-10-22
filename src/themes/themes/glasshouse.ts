import type { ThemeConfig } from "../types";

export const glasshouseTheme: ThemeConfig = {
  id: "glasshouse",
  name: "Теплица (Glasshouse)",
  tokens: {
    colors: {
      background: "#cdd5cb",
      surface: "#f3f2ea",
      surfaceHigh: "#e8ebe4",
      onSurface: "#1d2117",
      onSurfaceVariant: "rgba(29, 33, 23, 0.66)",
      primary: "#1d2117",
      primaryContainer: "#d6f06b",
      onPrimaryContainer: "#1d2117",
      secondary: "#1a2419",
      secondaryContainer: "#cdd5cb",
      onSecondaryContainer: "#1d2117",
      outline: "rgba(29, 33, 23, 0.16)",
      outlineVariant: "rgba(29, 33, 23, 0.08)",
      ink: "#1d2117",
      parchment: "#f3f2ea",
      aged: "#cdd5cb",
    },
    typography: {
      headlineFont: "'Instrument Serif', 'Times New Roman', serif",
      headlineWeight: "400",
      bodyFont: "'Inter Variable', 'Inter', system-ui, sans-serif",
      labelFont: "'IBM Plex Mono', ui-monospace, monospace",
    },
    texture: {
      svg: 'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E',
      opacity: 0.04,
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
    },
  },
  sections: ["hero-glasshouse", "sidebar"],
  sidebar: {
    title: "О теплице",
    description:
      "Подборка, выращенная под стеклом: книги, которые согревают и открывают новые миры.",
    items: [
      { icon: "local_florist", label: "Выращено здесь" },
      { icon: "wb_sunny", label: "Тепло и свет" },
    ],
    cta: {
      label: "Сохранить подборку",
      href: "#",
    },
  },
};