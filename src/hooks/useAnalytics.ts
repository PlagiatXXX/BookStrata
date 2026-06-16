import { useCallback, useEffect, useRef, useState } from "react";

const COOKIE_NAME = "cookie_consent";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

declare global {
  interface Window {
    ym: (id: number, action: string, ...args: unknown[]) => void;
  }
}

export function useAnalytics() {
  const [isConsented, setIsConsented] = useState(
    () => getCookie(COOKIE_NAME) === "1",
  );
  const metrikaLoadedRef = useRef(false);

  const accept = useCallback(() => {
    if (metrikaLoadedRef.current) return;
    metrikaLoadedRef.current = true;
    setCookie(COOKIE_NAME, "1", 365);
    setIsConsented(true);
  }, []);

  // Инициализация Яндекс.Метрики после согласия
  useEffect(() => {
    if (!isConsented || metrikaLoadedRef.current) return;

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
    });
  }, [isConsented]);

  const initIfConsented = useCallback(() => {
    if (isConsented) {
      accept();
    }
  }, [isConsented, accept]);

  return { accept, initIfConsented, isConsented };
}
