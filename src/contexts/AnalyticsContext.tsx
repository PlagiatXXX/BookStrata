/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    ym: (id: number, action: string, ...args: unknown[]) => void;
  }
}

const DISMISS_KEY = "bookstrata-cookie-notice";

interface AnalyticsContextValue {
  isConsented: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  // Счётчик Яндекс.Метрики подключается в index.html (см. head), а не через
  // JS-бандл — так тег видят роботы и охват тега во всех страницах.
  // Здесь — только баннер согласия на куки.

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore — приватный режим
    }
    setDismissed(true);
  };

  const value = useMemo(() => ({ isConsented: true }), []);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none"
          >
            <div className="mx-auto max-w-4xl rounded-2xl border border-[#2a2a2a] bg-[#121212]/95 backdrop-blur-md p-4 md:p-5 shadow-2xl pointer-events-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
                <div className="flex-1 text-sm leading-relaxed text-[#b8b1a3]">
                  <span className="text-[#f3efe6] font-medium">
                    Используем куки и рекомендательные технологии.
                  </span>{" "}
                  Это чтобы сайт работал лучше. Оставаясь с нами, вы
                  соглашаетесь на использование файлов куки.
                </div>
                <button
                  onClick={handleDismiss}
                  className="shrink-0 cursor-pointer rounded-lg bg-[#d94f2b] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#c04424] active:scale-95"
                >
                  Хорошо
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return ctx;
}
