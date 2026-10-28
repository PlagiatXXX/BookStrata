import type { ThemeConfig } from "../types";

export const halloweenTheme: ThemeConfig = {
  id: "halloween",
  name: "Хэллоуин",
  tokens: {
    colors: {
      background: "#07080d",
      surface: "#0c0f16",
      surfaceHigh: "#141822",
      onSurface: "#f2edf1",
      onSurfaceVariant: "#bab5c1",
      primary: "#fb923c",
      primaryContainer: "#c2410c",
      onPrimaryContainer: "#fff7ed",
      secondary: "#a78bfa",
      secondaryContainer: "#2e1b4b",
      onSecondaryContainer: "#ede9fe",
      outline: "#713f2c",
      outlineVariant: "#30232c",
      ink: "#fff7ed",
      parchment: "#fff7ed",
      aged: "#271a1b",
    },
    typography: {
      headlineFont: "'Instrument Serif', Georgia, serif",
      headlineWeight: "400",
      bodyFont: "'Inter Variable', Inter, system-ui, sans-serif",
      labelFont: "'IBM Plex Mono', ui-monospace, monospace",
    },
    texture: {
      svg: 'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E',
      opacity: 0.035,
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
    },
  },
  sections: [],
  decor: "haunted-night",
};
