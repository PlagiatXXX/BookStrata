import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  ChevronDown,
  List,
  Folder,
  Users,
  Star,
  User,
  HelpCircle,
  Copy,
  Check,
  ScrollText,
  Shield,
  Info,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { Meteors } from "./Meteors";
import { SocialIcons } from "./SocialIcons";
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

const TELEGRAM_URL = "https://t.me/PasFedor";
const VK_URL = "https://vk.com/club237287277";

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth" })
}

const mainLinks = [
  { href: "/", label: "Главная", icon: <List size={14} /> },
  { href: "/blog", label: "Блог", icon: <BookOpen size={14} /> },
  { href: "/rankings", label: "Рейтинг книг", icon: <BarChart3 size={14} /> },
  { href: "/what-to-read", label: "Что почитать", icon: <BookOpen size={14} /> },
  { href: "/celebrities", label: "Знаменитости", icon: <Star size={14} /> },
  { href: "/templates", label: "Библиотека", icon: <Folder size={14} /> },
  { href: "/community", label: "Сообщество", icon: <Users size={14} /> },
];

const landingLinks: { label: string; icon: React.ReactNode; sectionId?: string; href?: string }[] = [
  { sectionId: "features", label: "Возможности", icon: <Sparkles size={14} /> },
  { sectionId: "pricing", label: "Тарифы", icon: <Shield size={14} /> },
];

const userLinks = [
  { href: "/profile", label: "Профиль", icon: <User size={14} /> },
  { href: "/about", label: "О проекте", icon: <Info size={14} /> },
  { href: "/contact", label: "Контакты", icon: <HelpCircle size={14} /> },
  { href: "/privacy", label: "Политика", icon: <ScrollText size={14} /> },
  { href: "/terms", label: "Условия", icon: <Shield size={14} /> },
];

const landingUserLinks: { label: string; icon: React.ReactNode; href?: string; isExternal?: boolean }[] = [
  { href: "/privacy", label: "Политика конфиденциальности", icon: <ScrollText size={14} /> },
  { href: "/terms", label: "Условия использования", icon: <Shield size={14} /> },
  { href: "/about", label: "О проекте", icon: <Info size={14} /> },
  { href: "/contact", label: "Контакты", icon: <HelpCircle size={14} /> },
];

const combinedLinks = [...mainLinks, ...userLinks];
const combinedLandingLinks = [...landingLinks, ...landingUserLinks];

type PopupDirection = "above" | "below";

export const Footer = ({ variant }: { variant?: "default" | "landing" }) => {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [popupDirection, setPopupDirection] = useState<PopupDirection>("above");
  const [copied, setCopied] = useState(false);
  const location = useLocation();

  const isLanding = variant === "landing";

  const { data: donors = [] } = useQuery({
    queryKey: ["donors"],
    queryFn: () =>
      apiClient.get<Array<{ id: number; name: string }>>('/donors')
        .then((data) => data.map((d) => d.name)),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const cardNumber = "2202200609389554";

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      window.ym?.(109755750, 'reachGoal', 'donate_copy')
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = cardNumber;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.ym?.(109755750, 'reachGoal', 'donate_copy')
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const recalcPosition = useCallback(() => {
    const button = document.getElementById("donate-button");
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popupHeight = 232; // ~220px + 12px gap

    // На мобилке футер внизу — всегда открываем выше
    // Если сверху тоже не хватает — ставим куда больше места
    if (spaceBelow >= popupHeight && window.innerWidth >= 768) {
      setPopupDirection("below");
    } else if (spaceAbove >= popupHeight) {
      setPopupDirection("above");
    } else {
      // В крайнем случае — выше, попап будет с overflow
      setPopupDirection(spaceAbove > spaceBelow ? "above" : "below");
    }
  }, []);

  const toggleDonate = useCallback(() => {
    if (!isDonateOpen) {
      recalcPosition();
    }
    setIsDonateOpen((prev) => !prev);
  }, [isDonateOpen, recalcPosition]);

  // Пересчитываем позицию при скролле/ресайзе пока открыт
  useEffect(() => {
    if (!isDonateOpen) return;
    const handle = () => recalcPosition();
    window.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [isDonateOpen, recalcPosition]);

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
    <footer className="relative overflow-x-hidden border-t border-white/10 bg-[radial-gradient(circle_at_10%_120%,rgba(249,115,22,0.15),transparent_45%),#0b0f1f] px-6 py-12">
      <style>{marqueeStyle}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Meteors number={40} angle={255} minDuration={10} maxDuration={22} minDelay={0} maxDelay={1.5} />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 relative z-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1.4fr_1.2fr]">
          {/* Left Zone: Brand & Positioning */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80 mb-1">
                BookStrata
              </p>
              <h3 className="text-xl font-bold text-[#f3efe6]">
                Крупнейшая библиотека
              </h3>
              <p className="mt-2 text-sm text-[#b8b1a3] leading-relaxed max-w-xs">
                пользовательских рейтингов книг.
              </p>
            </div>
          </div>

          {/* Central Zone: Main Links + SocialIcons (под одной шапкой) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">
              Основное
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <nav aria-label="Основная навигация футера" className="shrink-0">
                <ul className="flex flex-col gap-3">
                  {(isLanding ? combinedLandingLinks : combinedLinks).map((link) => {
                    const isScroll = "sectionId" in link && link.sectionId
                    const key = isScroll ? link.sectionId! : ("href" in link ? link.href! : "")
                    return (
                      <li key={key}>
                        {isScroll ? (
                          <button
                            onClick={() => scrollToSection(link.sectionId!)}
                            className="group flex items-center gap-2 text-sm text-[#b8b1a3] transition-all hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md px-1 -mx-1 cursor-pointer"
                          >
                            <span className="text-[#b8b1a3]/50 group-hover:text-cyan-400 transition-colors">
                              {link.icon}
                            </span>
                            {link.label}
                          </button>
                        ) : (
                          <Link
                            to={"href" in link ? link.href! : ""}
                            className="group flex items-center gap-2 text-sm text-[#b8b1a3] transition-all hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md px-1 -mx-1"
                          >
                            <span className="text-[#b8b1a3]/50 group-hover:text-cyan-400 transition-colors">
                              {link.icon}
                            </span>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* SocialIcons — бургер рядом с Основное */}
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">
                  Соцсети
                </span>
                <SocialIcons
                  links={{
                    telegram: TELEGRAM_URL,
                    vk: VK_URL,
                    github: "https://github.com/PlagiatXXX",
                    yandexMail: "mailto:fedorpasyada@yandex.ru",
                    youtube: "https://www.youtube.com/@fedor1994",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Zone: Donate Block */}
          <div className="flex flex-col items-end self-end text-right">
            <div className="relative max-w-full">
              <button
                type="button"
                id="donate-button"
                onClick={toggleDonate}
                className="group relative z-20 inline-flex cursor-pointer items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-200/40 bg-amber-500/10 px-2.5 sm:px-3 py-2 text-xs md:text-sm font-bold text-amber-200 transition-all hover:bg-amber-500/20 hover:border-amber-200/60 overflow-hidden max-w-full"
                aria-expanded={isDonateOpen}
                aria-controls="donate-menu"
              >
                <span className="inline-block text-amber-400 text-sm sm:text-base leading-none animate-dove-flight shrink-0">🕊️</span>
                <span className="truncate">Поддержка проекта</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 shrink-0 ${
                    isDonateOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                id="donate-menu"
                className={`absolute z-10 w-[min(calc(100vw-3rem),320px)] max-h-[60vh] overflow-y-auto rounded-2xl border bg-slate-900/95 backdrop-blur-md transition-all duration-500 origin-bottom-right ${
                  popupDirection === "below"
                    ? "top-full mt-1"
                    : "bottom-full mb-1"
                } ${
                  isDonateOpen
                    ? "pointer-events-auto scale-100 border-amber-500/40 opacity-100 shadow-[0_20px_50px_rgba(249,115,22,0.3)]"
                    : "pointer-events-none scale-95 border-amber-500/10 opacity-0"
                } right-0`}
              >
                <div className="relative p-5">
                  <h3 className="text-base font-bold text-white">
                    Поддержать проект
                  </h3>
                  <p className="mt-2 text-xs text-amber-50/70 leading-relaxed text-left">
                    Ваша поддержка помогает оплачивать сервера и делать BookStrata
                    лучше. Спасибо, что вы с нами!
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                    <span className="font-mono text-xs font-bold text-amber-100 tracking-wider text-center sm:text-left">
                      {cardNumber}
                    </span>
                    <button
                      onClick={handleCopyCard}
                      className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 px-2 py-1.5 sm:py-1 text-[10px] font-medium text-amber-200 transition-colors hover:bg-amber-500/20 shrink-0"
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
              <span className="h-1 w-1 rounded-full bg-cyan-500 opacity-80" />
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
