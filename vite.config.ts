import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import sri from "rollup-plugin-sri";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    tailwindcss(),
    // Subresource Integrity — защита от битого кеша.
    // Если файл повреждён, хеш не совпадёт, браузер сам перезапросит его.
    {
      enforce: "post",
      ...sri({ publicPath: "/" }),
    },
  ],
  optimizeDeps: {
    exclude: ["nsfwjs"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
    server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: "hidden", // Sentry подгружает map-файлы через плагин, в браузер они не отдаются
    minify: "esbuild",
    target: "esnext",
    rollupOptions: {
      external: [/nsfwjs\/dist\/models/],
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "motion-vendor": ["framer-motion"],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
