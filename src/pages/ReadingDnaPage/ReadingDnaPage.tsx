import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sileo } from "sileo";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { DnaStepFlow } from "./components/DnaStepFlow";
import { ArchivalTicketCard } from "./components/ArchivalTicketCard";
import { DuelSection } from "./components/DuelSection";
import { HubSection } from "./components/HubSection";
import { useDnaArchetypes } from "./hooks/useDnaArchetypes";
import {
  findArchetypeByIdOrName,
  resolveArchetypeByRanges,
} from "./domain/dnaArchetypeMatch";
import {
  saveReadingDna,
  getReadingTicket,
  type ReadingDnaInputData,
  type ReadingDnaResponseData,
  type DnaAxesData,
  type DnaBookItemData,
} from "@/lib/readingDnaApi";
import "./readingDna.css";

export type DnaTheme = "dark" | "craft";

export const DNA_THEME_KEY = "bs_reading_dna_theme";
export const DNA_DRAFT_KEY = "bs_reading_dna_draft";
export const DNA_TICKET_KEY = "bs_reading_dna_ticket";

export interface ReadingDnaDraft {
  step: number;
  axes: DnaAxesData;
  favoriteBooks: (DnaBookItemData | null)[];
  kryptonite: DnaBookItemData | null;
  touchedAxes?: Record<string, boolean>;
}

const INITIAL_AXES: DnaAxesData = {
  storyFocus: 0,
  emotionalWeight: 0,
  pace: 0,
  darkness: 0,
  scope: 0,
  complexity: 0,
};

const DOC_TABS = [
  { label: "Тест", id: "doc-0" },
  { label: "Билет", id: "doc-1" },
  { label: "Дуэль", id: "doc-2" },
  { label: "Витрина", id: "doc-3" },
];

export default function ReadingDnaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");
  const { archetypes } = useDnaArchetypes();

  // Тема оформления с сохранением в localStorage (по умолчанию светлая "craft")
  const [theme, setTheme] = useState<DnaTheme>(() => {
    try {
      const stored = localStorage.getItem(DNA_THEME_KEY);
      if (stored === "dark" || stored === "craft") {
        return stored;
      }
    } catch {
      // ignore
    }
    return "craft";
  });

  useEffect(() => {
    try {
      localStorage.setItem(DNA_THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Восстановление черновика теста при входе
  const [initialDraft] = useState<ReadingDnaDraft>(() => {
    try {
      const raw = localStorage.getItem(DNA_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return {
            step: typeof parsed.step === "number" ? Math.max(0, Math.min(parsed.step, 6)) : 0,
            axes: { ...INITIAL_AXES, ...(parsed.axes || {}) },
            favoriteBooks: Array.isArray(parsed.favoriteBooks)
              ? [0, 1, 2].map((i) => parsed.favoriteBooks[i] ?? null)
              : [],
            kryptonite: parsed.kryptonite || null,
            touchedAxes: parsed.touchedAxes || {},
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      step: 0,
      axes: INITIAL_AXES,
      favoriteBooks: [],
      kryptonite: null,
      touchedAxes: {},
    };
  });

  const [currentStep, setCurrentStep] = useState<number>(initialDraft.step);
  const [liveAxes, setLiveAxes] = useState<DnaAxesData>(initialDraft.axes);
  const [liveBooks, setLiveBooks] = useState<(DnaBookItemData | null)[]>(
    initialDraft.favoriteBooks
  );
  const [liveKryptonite, setLiveKryptonite] = useState<DnaBookItemData | null>(initialDraft.kryptonite);
  const [touchedAxes, setTouchedAxes] = useState<Record<string, boolean>>(initialDraft.touchedAxes || {});
  const ticketCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Автосохранение черновика при любом изменении
  useEffect(() => {
    try {
      const draftToSave: ReadingDnaDraft = {
        step: currentStep,
        axes: liveAxes,
        favoriteBooks: liveBooks,
        kryptonite: liveKryptonite,
        touchedAxes,
      };
      localStorage.setItem(DNA_DRAFT_KEY, JSON.stringify(draftToSave));
    } catch {
      // ignore
    }
  }, [currentStep, liveAxes, liveBooks, liveKryptonite, touchedAxes]);

  // Сохраненный билет из localStorage
  const [currentTicket, setCurrentTicket] = useState<ReadingDnaResponseData | null>(() => {
    try {
      const raw = localStorage.getItem(DNA_TICKET_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<number>(() => (ticketParam ? 1 : 0));
  const [isDuelAccepted, setIsDuelAccepted] = useState(false);

  // Загрузка билета по параметру ?ticket=BS-XXXX-X
  const { data: loadedTicket } = useQuery({
    queryKey: ["readingDna", "ticket", ticketParam],
    queryFn: () => (ticketParam ? getReadingTicket(ticketParam) : null),
    enabled: Boolean(ticketParam),
  });

  const activeTicket = currentTicket || loadedTicket;

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "craft" : "dark"));
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleResetProgress = useCallback(() => {
    try {
      localStorage.removeItem(DNA_DRAFT_KEY);
    } catch {
      // ignore
    }
    setCurrentStep(0);
    setLiveAxes(INITIAL_AXES);
    setLiveBooks([]);
    setLiveKryptonite(null);
    setTouchedAxes({});
  }, []);

  const handleSelectTab = useCallback((index: number) => {
    setActiveTab(index);
    if (typeof window !== "undefined" && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Мутация сохранения ДНК
  const saveMutation = useMutation({
    mutationFn: (input: ReadingDnaInputData) => saveReadingDna(input),
    onSuccess: (saved) => {
      setCurrentTicket(saved);
      try {
        localStorage.setItem(DNA_TICKET_KEY, JSON.stringify(saved));
      } catch {
        // ignore
      }
      setSearchParams({ ticket: saved.ticketNumber });
      setTimeout(() => {
        handleSelectTab(1);
      }, 300);
    },
  });

  const handleCompleteFlow = useCallback(
    (data: ReadingDnaInputData) => {
      saveMutation.mutate(data);
    },
    [saveMutation]
  );

  const handleLiveAxisChange = useCallback((axis: keyof DnaAxesData, val: number) => {
    setLiveAxes((prev) => ({
      ...prev,
      [axis]: val,
    }));
  }, []);

  const handleBooksChange = useCallback(
    (fav: (DnaBookItemData | null)[], kryp: DnaBookItemData | null) => {
      setLiveBooks(fav);
      setLiveKryptonite(kryp);
    },
    []
  );

  // Скачивание билета в PNG (HD): инлайним картинки через прокси ради CORS
  const handleDownloadTicket = useCallback(async () => {
    const element = ticketCardRef.current;
    if (!element || !activeTicket) return;

    const originalSrc = new Map<HTMLImageElement, string>();

    setIsDownloading(true);

    try {
      const { toPng } = await import("html-to-image");

      const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(
        images.map(async (img) => {
          const src = img.getAttribute("src");
          if (!src || src.startsWith("data:")) return;

          try {
            const absoluteUrl = new URL(src, window.location.origin);
            const isSameOrigin = absoluteUrl.origin === window.location.origin;
            const proxyUrl = isSameOrigin
              ? absoluteUrl.toString()
              : `/api/proxy/image?url=${encodeURIComponent(absoluteUrl.toString())}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) return;

            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });

            originalSrc.set(img, src);
            img.src = dataUrl;
          } catch {
            // Не удалось — html-to-image попробует загрузить как есть
          }
        })
      );

      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 60));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: theme === "dark" ? "#2b1d14" : "#fffdf7",
      });

      const link = document.createElement("a");
      link.download = `bookstrata-ticket-${activeTicket.ticketNumber}.png`;
      link.href = dataUrl;
      link.click();

      sileo.success({
        title: "Билет сохранён",
        description: "PNG в HD-качестве скачан.",
      });
    } catch {
      sileo.error({
        title: "Не удалось скачать билет",
        description: "Попробуйте ещё раз.",
      });
    } finally {
      for (const [img, src] of originalSrc) {
        img.src = src;
      }
      setIsDownloading(false);
    }
  }, [activeTicket, theme]);

  const handleCopyLink = useCallback(async () => {
    const num = activeTicket?.ticketNumber || "BS-04821";
    const url = `https://bookstrata.ru/reading-dna/duel?ticket=${num}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Ссылка для друзей скопирована в буфер обмена!");
    } catch {
      // Fallback
    }
  }, [activeTicket]);

  const isDark = theme === "dark";

  return (
    <div
      data-dna-theme={isDark ? "dark" : "light"}
      className="min-h-screen w-full transition-colors duration-500 py-2 sm:py-4 px-2.5 sm:px-6 lg:px-8 flex flex-col"
      style={{
        background: isDark
          ? "radial-gradient(900px 500px at 50% -10%, rgba(255, 190, 100, 0.18), transparent 70%), #1a110c"
          : "linear-gradient(rgba(59, 110, 168, 0.12) 1px, transparent 1px) 0 0 / 100% 28px, linear-gradient(90deg, rgba(59, 110, 168, 0.1) 1px, transparent 1px) 0 0 / 28px 100%, #fbf8f2",
        color: isDark ? "#efe3cc" : "#2e2a24",
      }}
    >
      <SEOHead
        title="Книжный ДНК — литературный код и читательский билет | BookStrata"
        description="Пройди 60-секундный тест читательского вкуса, открой свой литературный архетип, получи номерной читательский билет тайного общества и проверь совместимость с друзьями."
        url="/reading-dna"
      />

      <div className="w-full flex flex-col flex-1">
        {/* Хлебные крошки + Назад на одном уровне */}
        <div className="flex items-center justify-between gap-3 pt-1 pb-2 text-xs select-none">
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Книжный ДНК" },
            ]}
            theme={isDark ? "dark" : "light"}
            className="mb-0"
          />

          <button
            type="button"
            onClick={handleBack}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-xs group ${
              isDark
                ? "border-[rgba(201,163,91,0.3)] bg-[#24170f]/70 hover:bg-[#c9a35b]/20 text-[#efe3cc]"
                : "border-[rgba(59,110,168,0.3)] bg-white/80 hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
            }`}
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Назад</span>
          </button>
        </div>

        {/* ШАПКА ПАПКИ (Точно как на скриншотах) */}
        <header className="sticky top-0 z-30 flex items-end justify-between gap-3 pt-2 pb-0 bg-inherit">
          {/* Заголовок страницы */}
          <h1
            className={`pb-1.5 text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
              isDark
                ? "font-serif text-[#efe3cc]"
                : "font-['Caveat',cursive] text-3xl sm:text-4xl text-[#2e2a24]"
            }`}
          >
            Книжный ДНК
          </h1>

          {/* Закладки папки — плотно прижаты к верхней линии папки */}
          <nav
            aria-label="Архивные разделы"
            className="flex items-end gap-1.5 select-none relative z-10 -mb-px"
          >
            {DOC_TABS.map((tab, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(idx)}
                  className={`px-3.5 sm:px-5 text-xs sm:text-sm rounded-t-xl border-t border-x border-b-0 transition-all cursor-pointer select-none ${
                    isActive
                      ? isDark
                        ? "bg-[#2a1a10] border-[rgba(201,163,91,0.45)] text-[#efe3cc] font-semibold pt-2 pb-2.5 relative z-20 shadow-xs"
                        : "bg-[#e8d5ad] border-[rgba(59,110,168,0.45)] text-[#2e2a24] font-semibold pt-2 pb-2.5 relative z-20 shadow-xs"
                      : isDark
                        ? "bg-[#2b1d14] border-[rgba(201,163,91,0.25)] text-[#a89678] hover:text-[#efe3cc] hover:bg-[#352318] py-2 relative z-10"
                        : "bg-[#fffdf7] border-[rgba(59,110,168,0.25)] text-[#6f6553] hover:text-[#2e2a24] hover:bg-white py-2 relative z-10"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Анимированный переключатель темы без блока (в точности как на портфолио) */}
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileHover={{ rotate: 180, scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            aria-label={isDark ? "Переключить на крафтовую анкету" : "Переключить на ночной архив"}
            title={isDark ? "Светлая крафтовая анкета" : "Темный ночной архив"}
            className="mb-1 cursor-pointer bg-transparent border-0 p-1 text-2xl leading-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
          >
            <span className="inline-block will-change-transform drop-shadow-sm">
              {isDark ? "☀️" : "🌙"}
            </span>
          </motion.button>
        </header>

        {/* ОСНОВНАЯ ПАПКА */}
        <main
          className={`rounded-b-2xl rounded-tr-2xl border p-3.5 sm:p-5 shadow-2xl transition-all duration-300 flex-1 ${
            isDark
              ? "bg-[#2a1a10] border-[rgba(201,163,91,0.35)]"
              : "bg-[#e8d5ad] border-[rgba(59,110,168,0.35)]"
          }`}
        >
          <AnimatePresence mode="wait">
            {activeTab === 0 && (
              <motion.section
                key="doc-0"
                id="doc-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="relative pt-4"
              >
                <div className="flex items-center justify-between mb-[-4px] ml-4 mr-2 relative z-20">
                  <div
                    className={`inline-block px-3.5 py-1 text-white text-xs font-semibold rounded-t-sm shadow-xs ${
                      isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                    }`}
                  >
                    Документ I — Анкета читателя
                  </div>
                  {(currentStep > 0 ||
                    liveBooks.some(Boolean) ||
                    liveKryptonite !== null ||
                    Object.values(liveAxes).some((v) => v !== 50)) && (
                    <button
                      type="button"
                      onClick={handleResetProgress}
                      className={`text-[11px] underline opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                        isDark ? "text-[#c9a35b]" : "text-[#3b6ea8]"
                      }`}
                      title="Очистить сохранённый черновик и начать опросник сначала"
                    >
                      ↺ Начать заново
                    </button>
                  )}
                </div>

                <div
                  className={`rounded-lg border p-5 sm:p-7 shadow-md grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-start ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  {/* Левая колонка: форма опросника */}
                  <div className="flex flex-col justify-between">
                    <DnaStepFlow
                      theme={theme}
                      onComplete={handleCompleteFlow}
                      onAxisChange={handleLiveAxisChange}
                      onBooksChange={handleBooksChange}
                      onStepChange={setCurrentStep}
                      onTouchedAxesChange={setTouchedAxes}
                      initialStep={initialDraft.step}
                      initialAxes={initialDraft.axes}
                      initialBooks={initialDraft.favoriteBooks}
                      initialKryptonite={initialDraft.kryptonite}
                      initialTouchedAxes={initialDraft.touchedAxes}
                      isLoading={saveMutation.isPending}
                    />
                  </div>

                  {/* Правая колонка: Live-превью билета */}
                  <div className="flex flex-col justify-center space-y-2.5">
                    <ArchivalTicketCard
                      ticketNumber={activeTicket?.ticketNumber || "BS-....."}
                      archetypeName={activeTicket?.archetypeName || ""}
                      axes={liveAxes}
                      favoriteBooks={liveBooks}
                      kryptoniteBook={liveKryptonite}
                      theme={theme}
                      isSealed={Boolean(activeTicket)}
                      sealImageUrl="/images/reading-dna/seal.png"
                    />
                    <span className="block text-[11px] opacity-60 text-center font-sans">
                      Номер BS-XXXXX выдаётся по порядку при запечатывании.
                    </span>
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === 1 && (
              <motion.section
                key="doc-1"
                id="doc-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="relative pt-2"
              >
                <div
                  className={`inline-block px-3.5 py-1 mb-[-4px] ml-4 relative z-20 text-white text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Документ II — Читательский билет
                </div>

                <div
                  className={`rounded-lg border p-2.5 sm:p-3.5 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  {activeTicket ? (
                    <div className="space-y-3.5">
                      <div className="w-full">
                        <div ref={ticketCardRef}>
                          <ArchivalTicketCard
                            ticketNumber={activeTicket.ticketNumber}
                            archetypeName={activeTicket.archetypeName}
                            axes={activeTicket.axes}
                            favoriteBooks={activeTicket.favoriteBooks}
                            kryptoniteBook={activeTicket.kryptoniteBook}
                            theme={theme}
                            isSealed={true}
                            sealImageUrl="/images/reading-dna/seal.png"
                          />
                        </div>

                        {/* 3 кнопки под билетом */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-4">
                          <button
                            type="button"
                            onClick={handleDownloadTicket}
                            disabled={isDownloading}
                            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                              isDark
                                ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                                : "bg-[#b3412f] hover:bg-[#c94935]"
                            }`}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Готовим PNG...
                              </>
                            ) : (
                              "Скачать в HD (PNG)"
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isDark
                                ? "bg-[#2b1d14] border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/10"
                                : "bg-white border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
                            }`}
                          >
                            Скопировать ссылку для друзей
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectTab(2)}
                            className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isDark
                                ? "bg-[#2b1d14] border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/10"
                                : "bg-white border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
                            }`}
                          >
                            Бросить вызов другу
                          </button>
                        </div>
                      </div>

                      {/* Архивные карточки: Редкость и Анатомия билета */}
                      {(() => {
                        const arch =
                          findArchetypeByIdOrName(archetypes, activeTicket.archetypeName) ||
                          resolveArchetypeByRanges(archetypes, activeTicket.axes);
                        const luckySum = activeTicket.ticketNumber
                          .replace(/\D/g, "")
                          .split("")
                          .reduce((acc, d) => acc + parseInt(d, 10), 0);

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Карточка 1: Редкость ранга */}
                            <div
                              className={`p-4 sm:p-5 rounded-xl border flex flex-col justify-between space-y-3 ${
                                isDark
                                  ? "bg-[#2b1d14]/70 border-[rgba(201,163,91,0.25)] text-[#efe3cc]"
                                  : "bg-white/80 border-[rgba(59,110,168,0.25)] text-[#2e2a24]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs uppercase font-mono tracking-wider opacity-60">
                                  Редкость архетипа
                                </span>
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                                    isDark
                                      ? "bg-[#8a2433]/30 border-rose-500/40 text-rose-300"
                                      : "bg-[#b3412f]/10 border-rose-500/30 text-[#b3412f]"
                                  }`}
                                >
                                  {arch?.rarity || 7}%
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                                Из 1000 читателей лишь ~
                                <b>{(arch?.rarity || 7) * 10}</b> получают ранг «
                                <b>
                                  {isDark
                                    ? arch?.names.dark || activeTicket.archetypeName
                                    : arch?.names.craft || activeTicket.archetypeName}
                                </b>
                                ».
                              </p>
                              {arch?.quote && (
                                <p
                                  className={`text-xs italic font-serif border-l-2 pl-3 ${
                                    isDark
                                      ? "border-[#c9a35b] text-[#c9a35b]/90"
                                      : "border-[#3b6ea8] text-[#3b6ea8]/90"
                                  }`}
                                >
                                  «{arch.quote}»
                                </p>
                              )}
                            </div>

                            {/* Карточка 2: Что внутри билета */}
                            <div
                              className={`p-4 sm:p-5 rounded-xl border space-y-2.5 text-xs ${
                                isDark
                                  ? "bg-[#2b1d14]/70 border-[rgba(201,163,91,0.25)] text-[#efe3cc]"
                                  : "bg-white/80 border-[rgba(59,110,168,0.25)] text-[#2e2a24]"
                              }`}
                            >
                              <div className="text-xs uppercase font-mono tracking-wider opacity-60 mb-1">
                                Анатомия билета
                              </div>
                              <ul className="space-y-1.5 leading-relaxed opacity-85">
                                <li>
                                  <b className="opacity-100">№ билета:</b> номер{" "}
                                  <span className="font-mono">{activeTicket.ticketNumber}</span>
                                  {luckySum > 0 && ` (сумма цифр ${luckySum})`}.
                                </li>
                                <li>
                                  <b className="opacity-100">Орден:</b> {arch?.caste.name} (серия «ДНК»).
                                </li>
                                <li>
                                  <b className="opacity-100">Канон:</b> 3 священные книги + 1 криптонит с печатью иммунитета.
                                </li>
                                <li>
                                  <b className="opacity-100">Радар & Паспорт:</b> 6 осей вкуса в координатах [0–100].
                                </li>
                                <li>
                                  <b className="opacity-100">QR-код:</b> прямая ссылка на слепую дуэль читательских вкусов.
                                </li>
                              </ul>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* НАЧАЛЬНОЕ СОСТОЯНИЕ ДОКУМЕНТА II (В ТОЧНОСТИ КАК НА СКРИНШОТЕ!) */
                    <div className="py-8 px-4 text-center max-w-md mx-auto space-y-3">
                      <h3
                        className={`text-xl sm:text-2xl font-bold ${
                          isDark
                            ? "font-serif text-[#efe3cc]"
                            : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
                        }`}
                      >
                        Бланк пуст
                      </h3>
                      <p className="text-xs sm:text-sm opacity-70 leading-relaxed">
                        Ответьте на вопросы и запечатайте билет в первом документе.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSelectTab(0)}
                        className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
                          isDark
                            ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                            : "bg-[#b3412f] hover:bg-[#c94935]"
                        }`}
                      >
                        К анкете
                      </button>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 2 && (
              <motion.section
                key="doc-2"
                id="doc-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="relative pt-4"
              >
                <div
                  className={`inline-block px-3.5 py-1 mb-[-4px] ml-4 relative z-20 text-white text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Документ III — Слепая дуэль
                </div>

                <div
                  className={`rounded-lg border p-5 sm:p-7 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  {isDuelAccepted || activeTicket ? (
                    <DuelSection
                      userAxes={activeTicket?.axes || liveAxes}
                      challengerName="Алексей"
                      theme={theme}
                    />
                  ) : (
                    <div className="py-8 px-4 text-center max-w-lg mx-auto space-y-3">
                      <h2
                        className={`text-xl sm:text-2xl font-bold ${
                          isDark
                            ? "font-serif text-[#efe3cc]"
                            : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
                        }`}
                      >
                        Алексей бросил вам вызов
                      </h2>
                      <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                        Его ранг: <b>Хранитель запретных фолиантов</b>.<br />
                        Отвечайте честно, без подглядывания.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsDuelAccepted(true)}
                        className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
                          isDark
                            ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                            : "bg-[#b3412f] hover:bg-[#c94935]"
                        }`}
                      >
                        Принять вызов
                      </button>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 3 && (
              <motion.section
                key="doc-3"
                id="doc-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="relative pt-4"
              >
                <div
                  className={`inline-block px-3.5 py-1 mb-[-4px] ml-4 relative z-20 text-white text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Документ IV — Витрина
                </div>

                <div
                  className={`rounded-lg border p-5 sm:p-7 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  <HubSection theme={theme} />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
