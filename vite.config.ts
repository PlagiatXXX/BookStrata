import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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
    },
  },
  build: {
    minify: "esbuild",
    target: "esnext",
    rollupOptions: {
      external: [/nsfwjs\/dist\/models/],
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "dnd-vendor": [
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
          ],
          "motion-vendor": ["framer-motion"],
          "tiptap-vendor": ["@tiptap/react", "@tiptap/starter-kit"],
          "tf-vendor": [
            "@tensorflow/tfjs-core",
            "@tensorflow/tfjs-backend-webgl",
            "nsfwjs",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
