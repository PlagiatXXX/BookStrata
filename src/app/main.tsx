import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import "../styles/globals.css";
import { router } from "./router";
import { initYandexMetrika } from "../lib/ym";
import { AppErrorBoundary } from "../components/ErrorBoundary/AppErrorBoundary";

// Sentry — lazy init (динамический import ~60KB, не блокирует first paint)
import("../lib/sentry").then(({ initSentry }) => initSentry());

// Яндекс.Метрика — lazy init (внедряет скрипт асинхронно)
initYandexMetrika();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
