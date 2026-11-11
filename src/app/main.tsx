import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import "../styles/globals.css";
import { router } from "./router";
import { initYandexMetrika } from "../lib/ym";
import { AppErrorBoundary } from "../components/ErrorBoundary/AppErrorBoundary";
import { removeCacheBustParam } from "../lib/lazy";

// Бесшовная очистка служебного параметра ?__bust=... из адресной строки после перезагрузки
if (typeof window !== "undefined" && window.location.search.includes("__bust")) {
  const cleanUrl = removeCacheBustParam(window.location.href);
  if (cleanUrl !== window.location.href) {
    window.history.replaceState(null, "", cleanUrl);
  }
}

// Sentry — инициализируется после полной загрузки страницы в idle-период,
// чтобы не конкурировать с FCP/LCP и шрифтами на медленных мобильных сетях
if (typeof window !== "undefined") {
  const scheduleSentry = () => {
    const load = () => {
      import("../lib/sentry").then(({ initSentry }) => initSentry());
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(load, { timeout: 6000 });
    } else {
      setTimeout(load, 3000);
    }
  };

  if (document.readyState === "complete") {
    scheduleSentry();
  } else {
    window.addEventListener("load", scheduleSentry, { once: true });
  }
}

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
