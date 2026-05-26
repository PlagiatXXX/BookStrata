import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles,
  ChevronDown,
  List,
  Folder,
  Users,
  User,
  MessageCircle,
  Share2,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { RainEffect } from "./RainEffect";
import { apiClient } from "@/lib/api-client";

const marqueeStyle = `
@keyframes marquee {
  from { transform: translateX(100vw); }
  to { transform: translateX(-100%); }
}
.animate-marquee {
  animation: marquee 27s linear infinite;
}
`

const TELEGRAM_URL = "https://t.me/bookstrata";
const VK_URL = "https://vk.com/club237287277";

const mainLinks = [
  { href: "/", label: "Мои рейтинги", icon: <List size={14} /> },
  { href: "/templates", label: "Библиотека", icon: <Folder size={14} /> },
  { href: "/community", label: "Сообщество", icon: <Users size={14} /> },
];

const userLinks = [
  { href: "/profile", label: "Профиль", icon: <User size={14} /> },
  {
    href: TELEGRAM_URL,
    label: "Telegram",
    icon: <MessageCircle size={14} />,
    isExternal: true,
  },
  {
    href: VK_URL,
    label: "ВКонтакте",
    icon: <Share2 size={14} />,
    isExternal: true,
  },
];

export const Footer = () => {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [donors, setDonors] = useState<string[]>([]);
  const location = useLocation();

  const cardNumber = "2202207455452840";
  useEffect(() => {
    apiClient.get<Array<{ id: number; name: string }>>('/donors')
      .then((data) => setDonors(data.map((d) => d.name)))
      .catch(() => {})
  }, [])

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = cardNumber;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDonateOpen) {
        setIsDonateOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const button = document.getElementById("donate-button");
      const menu = document.getElementById("donate-menu");
      if (
        isDonateOpen &&
        !button?.contains(e.target as Node) &&
        !menu?.contains(e.target as Node)
      ) {
        setIsDonateOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDonateOpen]);

  // Hide footer on admin and profile pages
  const isHidden =
    location.pathname.startsWith("/admin") || location.pathname === "/profile";
  if (isHidden) return null;

  return (
    <footer className="relative border-t border-white/10 bg-[radial-gradient(circle_at_10%_120%,rgba(249,115,22,0.15),transparent_45%),#0b0f1f] px-6 py-12 overflow-hidden">
      <style>{marqueeStyle}</style>
      <RainEffect />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 relative z-10">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          {/* Left Zone: Brand & Positioning */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80 mb-1">
                BookStrata Pro
              </p>
              <h3 className="text-xl font-bold text-[#f3efe6]">
                Рейтинги без шума.
              </h3>
              <p className="mt-2 text-sm text-[#b8b1a3] leading-relaxed max-w-xs">
                Ваша персональная библиотека для структурирования знаний и
                обмена опытом через визуальные тир-листы.
              </p>
            </div>
          </div>

          {/* Central Zone 1: Main Links */}
          <nav aria-label="Основная навигация футера">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
              Основное
            </h4>
            <ul className="flex flex-col gap-3">
              {mainLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group flex items-center gap-2 text-sm text-[#b8b1a3] transition-all hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md px-1 -mx-1"
                  >
                    <span className="text-[#b8b1a3]/50 group-hover:text-cyan-400 transition-colors">
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Central Zone 2: User Actions */}
          <nav aria-label="Пользовательские ссылки">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
              Пользователю
            </h4>
            <ul className="flex flex-col gap-3">
              {userLinks.map((link) => (
                <li key={link.href}>
                  {link.isExternal ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-sm text-[#b8b1a3] transition-all hover:text-fuchsia-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 rounded-md px-1 -mx-1"
                    >
                      <span className="text-[#b8b1a3]/50 group-hover:text-fuchsia-400 group-hover:scale-110 transition-all duration-300">
                        {link.icon}
                      </span>
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-sm text-[#b8b1a3] transition-all hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md px-1 -mx-1"
                    >
                      <span className="text-[#b8b1a3]/50 group-hover:text-cyan-400 transition-colors">
                        {link.icon}
                      </span>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link
                  to="/contact"
                  className="group flex items-center gap-2 text-sm text-[#b8b1a3] transition-all hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md px-1 -mx-1"
                >
                  <span className="text-[#b8b1a3]/50 group-hover:text-cyan-400 transition-colors">
                    <HelpCircle size={14} />
                  </span>
                  Контакты
                </Link>
              </li>
            </ul>
          </nav>

          {/* Right Zone: Donate Block */}
          <div className="flex flex-col items-start lg:items-end lg:text-right">
            <div className="relative">
              <button
                type="button"
                id="donate-button"
                onClick={() => setIsDonateOpen((prev) => !prev)}
                className="group relative z-20 inline-flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-200 transition-all hover:bg-amber-500/20 hover:border-amber-200/60 overflow-hidden"
                aria-expanded={isDonateOpen}
                aria-controls="donate-menu"
              >
                <Sparkles
                  size={16}
                  className="text-amber-400 group-hover:animate-pulse"
                />
                Поддержка проекта
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${
                    isDonateOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                id="donate-menu"
                className={`absolute top-full z-10 w-[min(calc(100vw-3rem),320px)] overflow-hidden rounded-2xl border bg-slate-900/95 backdrop-blur-md transition-all duration-500 lg:origin-top-right lg:left-auto lg:right-0 ${
                  isDonateOpen
                    ? "pointer-events-auto scale-100 border-amber-500/40 opacity-100 shadow-[0_20px_50px_rgba(249,115,22,0.3)]"
                    : "pointer-events-none scale-95 border-amber-500/10 opacity-0 -translate-y-4"
                } ${isDonateOpen ? "left-0 mt-3" : "left-0 -translate-y-4"}`}
              >
                <div className="relative p-5">
                  <h3 className="text-base font-bold text-white">
                    Поддержать проект
                  </h3>
                  <p className="mt-2 text-xs text-amber-50/70 leading-relaxed text-left">
                    Ваша поддержка помогает оплачивать сервера и делать BookStrata
                    лучше. Спасибо, что вы с нами!
                  </p>

                  <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                    <span className="font-mono text-sm font-bold text-amber-100 tracking-wider">
                      {cardNumber}
                    </span>
                    <button
                      onClick={handleCopyCard}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/30 px-2.5 py-1 text-[10px] font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                      type="button"
                      aria-label="Копировать номер карты"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? "Скопировано" : "Копировать"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-amber-300/60">
                    Сбербанк • Федор П.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Donor Ticker + Copyright & Trust message */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-8">
          {donors.length > 0 && (
            <div className="relative overflow-hidden w-full">
              <div className="overflow-hidden w-full">
                <div className="animate-marquee w-fit whitespace-nowrap text-[11px] font-medium text-amber-200/40">
                  {donors.map((name) => `♥ ${name}`).join('  ·  ')}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-cyan-500 animate-pulse" />
              <p className="text-[11px] font-medium text-[#8f8a80]">
                © {new Date().getFullYear()} BookStrata Pro. Все права защищены.
              </p>
            </div>

            <div className="relative px-4 py-1.5 rounded-full bg-white/5 border border-white/10 group overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-fuchsia-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer" />
              <p className="relative z-10 flex items-center gap-2 text-[11px] font-medium text-[#8f8a80]">
                <span className="text-cyan-400">✦</span>
                Спасибо, что развиваете проект вместе с нами
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
