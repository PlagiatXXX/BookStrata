import type { ThemeConfig } from "../types";

export const autumnTheme: ThemeConfig = {
  id: "autumn",
  name: "Осенний дизайн",
  tokens: {
    colors: {
      background: "#fcf9f2",
      surface: "#f1eee7",
      surfaceHigh: "#ebe8e1",
      onSurface: "#1c1c18",
      onSurfaceVariant: "#53433d",
      primary: "#86452a",
      primaryContainer: "#a45c40",
      onPrimaryContainer: "#fff1ec",
      secondary: "#496455",
      secondaryContainer: "#ccead6",
      onSecondaryContainer: "#4f6a5b",
      outline: "#86736c",
      outlineVariant: "#d9c2ba",
      ink: "#382110",
      parchment: "#FFFFFF",
      aged: "#D6D0C0",
    },
    typography: {
      headlineFont: '"EB Garamond", serif',
      headlineWeight: "500",
      bodyFont: '"Source Sans 3", sans-serif',
      labelFont: '"Merriweather", serif',
    },
    texture: {
      svg: 'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E',
      opacity: 0.05,
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
    },
  },
  sections: ["hero-split", "description", "filter-chips", "content-grid", "sidebar"],
  sidebar: {
    title: "Атмосфера осени",
    description:
      "Создайте уютное настроение с нашей подборкой. Идеально сочетается с пледом, горячим чаем и шумом дождя за окном.",
    items: [
      { icon: "local_cafe", label: "Кофе и книги" },
      { icon: "nightlight", label: "Долгие вечера" },
    ],
    cta: {
      label: "Сохранить подборку",
      href: "#",
    },
  },
  decor: "falling-leaves",
};
