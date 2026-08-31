import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
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
  CircleHelp,
  BarChart3,
  BookOpen,
  Coffee,
} from "lucide-react";
import { SocialIcons } from "./SocialIcons";
import { CoffeeCup } from "./CoffeeCup";
import { Fur } from "@/components/Fur";
import { apiClient } from "@/lib/api-client";
import { getCollections } from "@/lib/collectionsApi";
import { YM_GOALS } from "@/lib/ym-goals";

const marqueeStyle = `
@keyframes marquee {
  from { transform: translateX(100cqw); }
  to { transform: translateX(-100%); }
}
.animate-marquee {
  animation: marquee 27s linear infinite;
}
.marquee-container {
  container-type: inline-size;
}
`

const glassCard = "backdrop-blur-xl rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]";

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
  { href: "/templates", label: "Тир-листы", icon: <Folder size={14} /> },
  { href: "/community", label: "Сообщество", icon: <Users size={14} /> },
];

const landingLinks: { label: string; icon: React.ReactNode; sectionId?: string; href?: string }[] = [
  { sectionId: "features", label: "Возможности", icon: <Sparkles size={14} /> },
  { sectionId: "pricing", label: "Тарифы", icon: <Shield size={14} /> },
];

const userLinks = [
  { href: "/profile", label: "Профиль", icon: <User size={14} /> },
  { href: "/about", label: "О проекте", icon: <Info size={14} /> },
  { href: "/pricing", label: "Поддержать проект", icon: <Coffee size={14} /> },
  { href: "/contact", label: "Контакты", icon: <HelpCircle size={14} /> },
  { href: "/faq", label: "Вопросы и ответы", icon: <CircleHelp size={14} /> },
  { href: "/privacy", label: "Политика", icon: <ScrollText size={14} /> },
  { href: "/terms", label: "Условия", icon: <Shield size={14} /> },
];

const landingUserLinks: { label: string; icon: React.ReactNode; href?: string; isExternal?: boolean }[] = [
  { href: "/privacy", label: "Политика конфиденциальности", icon: <ScrollText size={14} /> },
  { href: "/terms", label: "Условия использования", icon: <Shield size={14} /> },
  { href: "/about", label: "О проекте", icon: <Info size={14} /> },
  { href: "/contact", label: "Контакты", icon: <HelpCircle size={14} /> },
  { href: "/faq", label: "Вопросы и ответы", icon: <CircleHelp size={14} /> },
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

  // Популярные подборки — перелинковка коллекций со всех страниц (SEO).
  // Тот же queryKey, что на странице коллекции — общий кэш.
  const { data: collections = [] } = useQuery({
    queryKey: ["all-collections"],
    queryFn: getCollections,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const cardNumber = "2202200609389554";

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      window.ym?.(109755750, 'reachGoal', YM_GOALS.DONATE_COPY)
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = cardNumber;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.ym?.(109755750, 'reachGoal', YM_GOALS.DONATE_COPY)
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
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#0d1b2a] via-[#1b263b] to-[#133d28] px-6 pt-16 pb-10">
      <style>{marqueeStyle}</style>

      {/* Organic wave overlays at top */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative block w-full h-[60px] md:h-[80px]" preserveAspectRatio="none">
          <path d="M0,40 C180,100 360,10 540,60 C720,110 900,20 1080,60 C1260,100 1350,30 1440,50 L1440,0 L0,0 Z" fill="url(#wave1)" fillOpacity="0.4" />
          <path d="M0,60 C240,110 480,20 720,70 C960,120 1200,30 1440,60 L1440,0 L0,0 Z" fill="url(#wave2)" fillOpacity="0.3" />
          <defs>
            <linearGradient id="wave1" x1="0" y1="0" x2="1440" y2="0">
              <stop offset="0%" stopColor="#1b263b" />
              <stop offset="50%" stopColor="#243447" />
              <stop offset="100%" stopColor="#1b263b" />
            </linearGradient>
            <linearGradient id="wave2" x1="0" y1="0" x2="1440" y2="0">
              <stop offset="0%" stopColor="#133d28" />
              <stop offset="50%" stopColor="#1a4a32" />
              <stop offset="100%" stopColor="#133d28" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Wave inner glow border */}
      <div className="absolute top-[55px] md;top-[75px] left-0 w-full h-px bg-white/10" />

      {/* Floating books background */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{ backgroundImage: "url(/footer-bg.webp)", backgroundSize: "cover", backgroundPosition: "center" }}
      />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.04),transparent_70%)]" />

      <div className="mx-auto flex w-full flex-col gap-8 relative z-10">
        {/* Бренд */}
        <div className="self-start w-56 md:w-72 h-11 md:h-14">
          <Fur text="Букстрата" color="#a855f7" className="w-full h-full">
            {/* семантический заголовок для SEO/скринридеров: визуально заменён мехом */}
            <h2 className="sr-only">Букстрата</h2>
          </Fur>
        </div>

        {/* Main content area */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Основное — слева */}
          <div className={glassCard}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">
              Основное
            </h4>
            <nav aria-label="Основная навигация футера">
              <ul className="flex flex-col gap-1">
                {(isLanding ? combinedLandingLinks : combinedLinks).map((link) => {
                  const isScroll = "sectionId" in link && link.sectionId;
                  const key = isScroll ? link.sectionId! : ("href" in link ? link.href! : "");
                  const analyticsName = `nav.footer.${link.label.toLowerCase().replace(/[\s]+/g, "_").replace(/[^a-zа-я0-9_]/g, "")}`;
                  return (
                    <li key={key}>
                      {isScroll ? (
                        <button
                          data-analytics={analyticsName}
                          onClick={() => scrollToSection(link.sectionId!)}
                          className="group flex items-center gap-1.5 text-[13px] text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md px-1 -mx-1 cursor-pointer"
                        >
                          <span className="text-white/40 group-hover:text-white/70 transition-colors">
                            {link.icon}
                          </span>
                          {link.label}
                        </button>
                      ) : (
                        <Link
                          data-analytics={analyticsName}
                          to={"href" in link ? link.href! : ""}
                          className="group flex items-center gap-1.5 text-[13px] text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md px-1 -mx-1"
                        >
                          <span className="text-white/40 group-hover:text-white/70 transition-colors">
                            {link.icon}
                          </span>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Подборки + Соцсети — по центру */}
          <div className="flex-1 flex flex-col sm:flex-row gap-8 justify-center">
            <div className={glassCard}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">
                Подборки
              </h4>
              <nav aria-label="Популярные подборки">
                <ul className="flex flex-col gap-1">
                  {collections.slice(0, 8).map((collection) => (
                    <li key={collection.id}>
                      <Link
                        to={`/collections/${collection.slug}`}
                        className="group text-[13px] text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md px-1 -mx-1"
                      >
                        {collection.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Соцсети + Донат */}
            <div className="flex flex-col gap-5">
              <div className={`${glassCard} flex flex-col items-center text-center !py-5`}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">
                  Соцсети
                </h4>
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

            {/* Donate button */}
            <div className="relative flex justify-center">
              <button
                type="button"
                id="donate-button"
                data-analytics="cta.footer.donate"
                onClick={toggleDonate}
                className="group relative z-20 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f6ebd7] px-5 py-2.5 text-sm font-medium text-slate-900 shadow-[0_0_25px_rgba(246,235,215,0.3)] transition-all hover:bg-white hover:scale-[1.02]"
                aria-expanded={isDonateOpen}
                aria-controls="donate-menu"
              >
                <CoffeeCup className="h-5 w-5 text-amber-700 shrink-0" />
                <span>Угостить автора кофе</span>
              </button>

              <div
                id="donate-menu"
                className={`absolute z-10 w-[min(calc(100vw-3rem),320px)] max-h-[60dvh] overflow-y-auto rounded-2xl border bg-slate-900/95 backdrop-blur-md transition-all duration-500 origin-bottom-right ${
                  popupDirection === "below"
                    ? "top-full mt-2"
                    : "bottom-full mb-2"
                } ${
                  isDonateOpen
                    ? "pointer-events-auto scale-100 border-white/15 opacity-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    : "pointer-events-none scale-95 border-white/5 opacity-0"
                } right-0`}
              >
                <div className="relative p-5">
                  <h3 className="text-base font-bold text-white">
                    Угостить автора
                  </h3>
                  <p className="mt-2 text-xs text-white/60 leading-relaxed text-left">
                    Ваша помощь помогает оплачивать сервера и делать BookStrata
                    лучше. Спасибо, что вы с нами!
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
                    <span className="font-mono text-xs font-bold text-white tracking-wider text-center sm:text-left">
                      {cardNumber}
                    </span>
                    <button
                      data-analytics="donate.footer.copy_card"
                      onClick={handleCopyCard}
                      className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/20 px-2 py-1.5 sm:py-1 text-[10px] font-medium text-white/80 transition-colors hover:bg-white/10 shrink-0"
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
                  <p className="mt-1.5 text-[10px] text-white/40">
                    Сбербанк • Федор П.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Donor Marquee */}
        {donors.length > 0 && (
          <div data-testid="donor-marquee" className="flex items-center gap-4 w-full border-t border-white/[0.06] pt-6">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-white/60">
              Меценаты проекта:
            </span>
            <div className="marquee-container relative flex-1 overflow-hidden">
              <div className="animate-marquee w-fit whitespace-nowrap text-[11px] font-medium text-white/30">
                {donors.map((name) => `♥ ${name}`).join('  ·  ')}
              </div>
            </div>
          </div>
        )}

        {/* Bottom: Copyright + Links */}
        <div className="flex flex-col items-center gap-2 border-t border-white/[0.06] pt-6">
          <p className="text-[11px] text-white/50">
            © {new Date().getFullYear()} BookStrata. Все права защищены.
          </p>
          <p className="text-[11px] text-white/50">
            <Link to="/privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link>
            {" | "}
            <Link to="/terms" className="hover:text-white transition-colors">Условия использования</Link>
          </p>
        </div>
      </div>
    </footer>
  );
};
