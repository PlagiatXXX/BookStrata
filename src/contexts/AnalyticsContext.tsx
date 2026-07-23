/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initPosthog } from "@/lib/posthog";

declare global {
  interface Window {
    ym: (id: number, action: string, ...args: unknown[]) => void;
  }
}

function initMetrika() {
  const counterId = import.meta.env.VITE_YM_COUNTER_ID;
  if (!counterId) return;

  const script = document.createElement("script");
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  script.async = true;
  document.head.appendChild(script);

  window.ym = window.ym || function (...args: unknown[]) {
    (window.ym as unknown as { a: unknown[]; l: number }).a =
      (window.ym as unknown as { a: unknown[]; l: number }).a || [];
    (window.ym as unknown as { a: unknown[] }).a.push(args);
  };
  (window.ym as unknown as { l: number }).l = Date.now();

  window.ym(Number(counterId), "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    defer: true,
  });
}

/** Загружает все аналитические сервисы, требующие согласия */
function loadAnalytics() {
  initMetrika();
  // PostHog — динамический import, не блокируем загрузку метрики
  initPosthog().catch(() => {});
}

interface AnalyticsContextValue {
  accept: () => void;
  isConsented: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [isConsented, setIsConsented] = useState(false);
  const metrikaLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/vanilla-cookieconsent@3.1.0/dist/cookieconsent.umd.js";
    script.async = true;

    script.onload = () => {
      if (cancelled) return;

      const CookieConsent = (window as unknown as { CookieConsent?: Record<string, unknown> }).CookieConsent as {
        getCookie: () => { categories?: string[] } | null;
        run: (config: Record<string, unknown>) => void;
        acceptCategory: (categories: string[]) => void;
        show: () => void;
      } | undefined;
      if (!CookieConsent) return;

      // Проверяем, нет ли уже сохранённого согласия
      try {
        const existingConsent = CookieConsent.getCookie();
        if (existingConsent?.categories?.includes("analytics")) {
          setIsConsented(true);
          if (!metrikaLoadedRef.current) {
            metrikaLoadedRef.current = true;
            loadAnalytics();
          }
        }
      } catch {
        // ignore — первый запуск, куки нет
      }

      CookieConsent.run({
        categories: {
          necessary: {
            enabled: true,
            readOnly: true,
          },
          analytics: {
            enabled: false,
            readOnly: false,
          },
        },
        language: {
          default: "ru",
          translations: {
            ru: {
              consentModal: {
                title: "Мы используем cookie",
                description:
                  "Собираем обезличенную аналитику, чтобы улучшать вашу работу с сайтом. Вы можете отказаться в любой момент.",
                acceptAllBtn: "Принять все",
                acceptNecessaryBtn: "Только необходимое",
                showPreferencesBtn: "Настроить",
                closeIconLabel: "Закрыть",
              },
              preferencesModal: {
                title: "Настройка cookie",
                acceptAllBtn: "Принять все",
                acceptNecessaryBtn: "Только необходимое",
                savePreferencesBtn: "Сохранить настройки",
                closeIconLabel: "Закрыть",
                sections: [
                  {
                    title: "Файлы cookie",
                    description:
                      "Здесь можно настроить, какие cookie вы разрешаете.",
                  },
                  {
                    title: "Строго необходимые",
                    description:
                      "Обеспечивают базовую работу сайта (авторизация, безопасность). Отключить нельзя.",
                    linkedCategory: "necessary",
                  },
                  {
                    title: "Аналитика",
                    description:
                      "Помогают понять, как вы используете сайт, чтобы улучшать его.",
                    linkedCategory: "analytics",
                  },
                ],
              },
            },
          },
        },
        guiOptions: {
          consentModal: {
            layout: "box",
            position: "bottom",
            flipButtons: false,
            equalWeightButtons: true,
          },
          preferencesModal: {
            layout: "box",
            position: "right",
            flipButtons: false,
            equalWeightButtons: true,
          },
        },
        cookie: {
          name: "cc_cookie",
          expiresAfterDays: 365,
        },
        onConsent: ({ cookie }: { cookie?: { categories?: string[] } }) => {
          if (cancelled) return;
          if (cookie?.categories?.includes("analytics")) {
            setIsConsented(true);
            if (!metrikaLoadedRef.current) {
              metrikaLoadedRef.current = true;
              loadAnalytics();
            }
          } else {
            setIsConsented(false);
          }
        },
        onChange: ({ cookie }: { cookie?: { categories?: string[] } }) => {
          if (cancelled) return;
          if (cookie?.categories?.includes("analytics")) {
            setIsConsented(true);
            if (!metrikaLoadedRef.current) {
              metrikaLoadedRef.current = true;
              loadAnalytics();
            }
          } else {
            setIsConsented(false);
          }
        },
        autoShow: true,
        hideFromBots: true,
      } as Record<string, unknown>);
    };

    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  const accept = useCallback(() => {
    const cc = (window as unknown as { CookieConsent?: Record<string, unknown> }).CookieConsent as {
      acceptCategory: (categories: string[]) => void;
    } | undefined;
    if (cc) {
      cc.acceptCategory(["analytics"]);
      setIsConsented(true);
    }
  }, []);

  const value = useMemo(() => ({ accept, isConsented }), [accept, isConsented]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
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
