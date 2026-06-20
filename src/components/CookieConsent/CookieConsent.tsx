import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/ui/Button";
import { Link, useLocation } from "react-router-dom";

export function CookieConsent() {
  const { accept, isConsented } = useAnalytics();
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (isConsented) {
      accept();
    }
  }, [isConsented, accept]);

  // Эффект для таймера показа баннера — только если нет согласия
  useEffect(() => {
    if (isConsented) return;
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [isConsented]);

  // Не показываем на странице авторизации
  if (pathname === "/auth") return null;
  if (isConsented) return null;
  if (!visible) return null;

  const handleAccept = () => {
    accept();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4">
      <div className="mx-auto max-w-3xl flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-background-dark/95 backdrop-blur-md px-5 py-4 shadow-2xl">
        <div className="hidden sm:flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/20">
          <Cookie size={20} className="text-violet-400" />
        </div>
        <div className="flex-1 text-sm text-gray-300">
          Мы используем cookie для аналитики, чтобы улучшать работу сайта.
          Продолжая использовать сайт, вы соглашаетесь с{" "}
          <Link
            to="/privacy"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
            onClick={() => setVisible(false)}
          >
            политикой обработки данных
          </Link>
          .
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="primary" size="sm" onClick={handleAccept}>
            Принять
          </Button>
        </div>
      </div>
    </div>
  );
}
