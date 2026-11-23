import { useContext, useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Swords, Copy, Compass } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sileo } from "sileo";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { DnaStepFlow } from "./components/DnaStepFlow";
import { ArchivalTicketCard } from "./components/ArchivalTicketCard";
import { DuelSection } from "./components/DuelSection";
import { HubSection } from "./components/HubSection";
import { DnaIntroSection } from "./components/DnaIntroSection";
import { DnaBookMatchBridge } from "./components/DnaBookMatchBridge";
import { DnaDuelsJournal } from "./components/DnaDuelsJournal";
import { DnaTwinsSection } from "./components/DnaTwinsSection";
import { StoryTicketCard } from "./components/StoryTicketCard";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { useDnaArchetypes } from "./hooks/useDnaArchetypes";
import {
  findArchetypeByIdOrName,
  formatQuote,
  resolveArchetypeByRanges,
} from "./domain/dnaArchetypeMatch";
import { AuthContext } from "@/contexts/auth.context";
import {
  saveReadingDna,
  getReadingTicket,
  conductReadingDuel,
  getMyReadingDna,
  shareReadingTicket,
  getReadingArchetypeStats,
  type ReadingDnaInputData,
  type ReadingDnaResponseData,
  type ReadingDnaDuelResultData,
  type DnaAxesData,
  type DnaBookItemData,
} from "@/lib/readingDnaApi";
import { apiTrackEvent } from "@/lib/analyticsApi";
import { pushDataLayerEvent } from "@/lib/gtm";
import {
  getDnaTicketStorageKey,
  getDnaDraftStorageKey,
  getOrCreateDnaGuestToken,
  cleanupLegacyDnaStorage,
  DNA_THEME_KEY,
  LEGACY_DNA_DRAFT_KEY as DNA_DRAFT_KEY,
  LEGACY_DNA_TICKET_KEY as DNA_TICKET_KEY,
} from "./utils/dnaStorage";
import "./readingDna.css";

export type DnaTheme = "dark" | "craft";

export { DNA_THEME_KEY, DNA_DRAFT_KEY, DNA_TICKET_KEY };

export interface ReadingDnaDraft {
  step: number;
  axes: DnaAxesData;
  favoriteBooks: (DnaBookItemData | null)[];
  kryptonite: DnaBookItemData | null;
  touchedAxes?: Record<string, boolean>;
  customName?: string;
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
  { label: "О проекте", id: "doc-intro" },
  { label: "Тест", id: "doc-0" },
  { label: "Билет", id: "doc-1" },
  { label: "Сравнение", id: "doc-2" },
  { label: "Витрина", id: "doc-3" },
];

export default function ReadingDnaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");
  const tabParam = searchParams.get("tab");
  const challengeParam = searchParams.get("challenge") || searchParams.get("duel");
  const compareParam = searchParams.get("compare");
  const withParam = searchParams.get("with");
  const { archetypes } = useDnaArchetypes();

  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const isAuthLoading = authContext?.isLoading ?? false;

  // Очистка устаревших глобальных ключей прошлых версий
  useEffect(() => {
    cleanupLegacyDnaStorage();
  }, []);

  const draftKey = getDnaDraftStorageKey(user?.userId);
  const ticketKey = getDnaTicketStorageKey(user?.userId);

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
      const raw = localStorage.getItem(draftKey);
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
            customName: typeof parsed.customName === "string" ? parsed.customName : undefined,
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
      customName: undefined,
    };
  });

  const [currentStep, setCurrentStep] = useState<number>(initialDraft.step);
  const [liveAxes, setLiveAxes] = useState<DnaAxesData>(initialDraft.axes);
  const [liveBooks, setLiveBooks] = useState<(DnaBookItemData | null)[]>(
    initialDraft.favoriteBooks
  );
  const [liveKryptonite, setLiveKryptonite] = useState<DnaBookItemData | null>(initialDraft.kryptonite);
  const [touchedAxes, setTouchedAxes] = useState<Record<string, boolean>>(initialDraft.touchedAxes || {});
  const [customName, setCustomName] = useState<string>(
    () => initialDraft.customName ?? user?.username ?? ""
  );
  const ticketCardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<"ticket" | "stories" | null>(null);
  const [isAiLibrarianOpen, setIsAiLibrarianOpen] = useState(false);
  const dnaStartedTrackedRef = useRef(false);

  // Автосохранение черновика при любом изменении
  useEffect(() => {
    try {
      const draftToSave: ReadingDnaDraft = {
        step: currentStep,
        axes: liveAxes,
        favoriteBooks: liveBooks,
        kryptonite: liveKryptonite,
        touchedAxes,
        customName: customName || undefined,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftToSave));
    } catch {
      // ignore
    }
  }, [draftKey, currentStep, liveAxes, liveBooks, liveKryptonite, touchedAxes, customName]);

  // Сохраненный билет из localStorage (изолированный по пользователю)
  const [currentTicket, setCurrentTicket] = useState<ReadingDnaResponseData | null>(() => {
    try {
      const raw = localStorage.getItem(ticketKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // При смене пользователя актуализируем локальный билет
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ticketKey);
      setCurrentTicket(raw ? JSON.parse(raw) : null);
    } catch {
      setCurrentTicket(null);
    }
  }, [ticketKey]);

  const [activeTab, setActiveTab] = useState<number>(() => {
    if (challengeParam || compareParam || withParam) return 3;
    if (tabParam === "compare") return 3;
    if (tabParam === "test") return 1;
    if (tabParam === "ticket" || ticketParam) return 2;
    if (tabParam === "hub") return 4;
    if (tabParam === "intro" || tabParam === "overview") return 0;
    if (currentTicket) return 2;
    if (initialDraft.step > 0) return 1;
    return 0;
  });

  const [initialDuelResult, setInitialDuelResult] =
    useState<ReadingDnaDuelResultData | null>(null);

  const [selectedOpponentTicket, setSelectedOpponentTicket] = useState<string | null>(
    () =>
      withParam ||
      challengeParam ||
      (compareParam && currentTicket?.ticketNumber === compareParam ? withParam : compareParam) ||
      (ticketParam && currentTicket?.ticketNumber !== ticketParam && tabParam === "compare"
        ? ticketParam
        : null) ||
      null
  );

  // Синхронизация активного таба и оппонента с URL при внешней навигации (popstate / вперед-назад)
  useEffect(() => {
    const curTabParam = searchParams.get("tab");
    const curChallengeParam = searchParams.get("challenge") || searchParams.get("duel");
    const curCompareParam = searchParams.get("compare");
    const curWithParam = searchParams.get("with");
    const curTicketParam = searchParams.get("ticket");

    if (curChallengeParam || curCompareParam || curWithParam) {
      setActiveTab(3);
    } else if (curTabParam === "compare") {
      setActiveTab(3);
    } else if (curTabParam === "test") {
      setActiveTab(1);
    } else if (curTabParam === "ticket" || curTicketParam) {
      setActiveTab(2);
    } else if (curTabParam === "hub") {
      setActiveTab(4);
    } else if (curTabParam === "intro" || curTabParam === "overview") {
      setActiveTab(0);
    }

    const target =
      curWithParam ||
      curChallengeParam ||
      (curCompareParam && currentTicket?.ticketNumber === curCompareParam
        ? curWithParam
        : curCompareParam) ||
      (curTicketParam && currentTicket?.ticketNumber !== curTicketParam && curTabParam === "compare"
        ? curTicketParam
        : null) ||
      null;
    setSelectedOpponentTicket(target);
  }, [searchParams, currentTicket?.ticketNumber]);

  // Определение номера билета оппонента для дуэли
  const opponentTicketNumber = selectedOpponentTicket;

  // Запрос сохраненного ДНК авторизованного пользователя с сервера
  const { data: myDna } = useQuery({
    queryKey: ["readingDna", "me", user?.userId],
    queryFn: getMyReadingDna,
    enabled: Boolean(user?.userId),
    staleTime: 60_000,
  });

  // Автоматическая синхронизация серверного ДНК в локальное состояние
  useEffect(() => {
    if (myDna && !currentTicket) {
      setCurrentTicket(myDna);
      try {
        localStorage.setItem(ticketKey, JSON.stringify(myDna));
      } catch {
        // ignore
      }
    }
  }, [myDna, currentTicket, ticketKey]);

  // Загрузка билета по параметру ?ticket=BS-XXXX-X
  const { data: loadedTicket } = useQuery({
    queryKey: ["readingDna", "ticket", ticketParam],
    queryFn: () => (ticketParam ? getReadingTicket(ticketParam) : null),
    enabled: Boolean(ticketParam),
  });

  // Загрузка билета оппонента (для дуэли)
  const { data: opponentTicket } = useQuery({
    queryKey: ["readingDna", "opponentTicket", opponentTicketNumber],
    queryFn: () => (opponentTicketNumber ? getReadingTicket(opponentTicketNumber) : null),
    enabled: Boolean(opponentTicketNumber),
  });

  // Реальная статистика распределения архетипов по базе данных
  const { data: archetypeStats } = useQuery({
    queryKey: ["readingDna", "stats"],
    queryFn: getReadingArchetypeStats,
    staleTime: 5 * 60_000,
  });

  // Если в URL передан чужой билет (?ticket=BS-XXXXX) — открываем именно его, а не собственный
  const isViewingOtherTicket = Boolean(
    ticketParam &&
    loadedTicket &&
    (!myDna || loadedTicket.ticketNumber !== myDna.ticketNumber)
  );

  const activeTicket = (ticketParam && loadedTicket)
    ? loadedTicket
    : (user ? (myDna || currentTicket) : currentTicket);

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
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setCurrentStep(0);
    setLiveAxes(INITIAL_AXES);
    setLiveBooks([]);
    setLiveKryptonite(null);
    setTouchedAxes({});
    setCustomName(user?.username ?? "");
  }, [draftKey, user?.username]);

  const handleSelectTab = useCallback(
    (index: number) => {
      setActiveTab(index);
      if (index === 1 && !dnaStartedTrackedRef.current) {
        dnaStartedTrackedRef.current = true;
        apiTrackEvent("dna_started", { hasChallenge: Boolean(challengeParam) });
        pushDataLayerEvent("dna_started", { has_challenge: Boolean(challengeParam) });
      }

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        // Очищаем параметры дуэли при переключении табов
        next.delete("with");
        next.delete("compare");
        next.delete("challenge");
        next.delete("duel");

        switch (index) {
          case 0:
            next.delete("tab");
            next.delete("ticket");
            break;
          case 1:
            next.set("tab", "test");
            next.delete("ticket");
            break;
          case 2:
            next.set("tab", "ticket");
            if (!isViewingOtherTicket) {
              next.delete("ticket");
            }
            break;
          case 3:
            next.set("tab", "compare");
            next.delete("ticket");
            break;
          case 4:
            next.set("tab", "hub");
            next.delete("ticket");
            break;
          default:
            break;
        }
        return next;
      });

      if (index !== 3) {
        setSelectedOpponentTicket(null);
        setInitialDuelResult(null);
      }

      if (typeof window !== "undefined" && window.scrollY > 0) {
        window.scrollTo({ top: 0 });
      }
    },
    [challengeParam, isViewingOtherTicket, setSearchParams]
  );

  const handleResetDuel = useCallback(() => {
    setSelectedOpponentTicket(null);
    setInitialDuelResult(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("with");
      next.delete("compare");
      next.delete("challenge");
      next.delete("duel");
      next.set("tab", "compare");
      return next;
    });
  }, [setSearchParams]);

  const handleOpenDuelWith = useCallback((oppTicketNum: string) => {
    setSelectedOpponentTicket(oppTicketNum);
    setActiveTab(3);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "compare");
      next.set("with", oppTicketNum);
      return next;
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setSearchParams]);

  // Мутация сохранения ДНК
  const saveMutation = useMutation({
    mutationFn: (input: ReadingDnaInputData) => saveReadingDna(input),
    onSuccess: async (saved) => {
      setCurrentTicket(saved);
      try {
        localStorage.setItem(ticketKey, JSON.stringify(saved));
      } catch {
        // ignore
      }

      apiTrackEvent("dna_sealed", {
        ticketNumber: saved.ticketNumber,
        archetype: saved.archetype,
        isGuest: !user,
      });
      pushDataLayerEvent("dna_sealed", {
        archetype: saved.archetype,
        is_guest: !user,
      });

      // Если пользователь пришёл по вызову на дуэль — автоматически проводим дуэль!
      if (
        opponentTicketNumber &&
        opponentTicketNumber.toUpperCase() !== saved.ticketNumber.toUpperCase()
      ) {
        try {
          const duelResult = await conductReadingDuel({
            targetTicketNumber: opponentTicketNumber,
            challengerTicketNumber: saved.ticketNumber,
          });
          apiTrackEvent("dna_duel", {
            targetTicketNumber: opponentTicketNumber,
            compatibility: duelResult.compatibility,
          });
          pushDataLayerEvent("dna_duel", {
            compatibility: duelResult.compatibility,
          });
          setInitialDuelResult(duelResult);
          setSearchParams({ ticket: saved.ticketNumber });
          setTimeout(() => {
            handleSelectTab(3);
          }, 350);
          return;
        } catch {
          // В случае ошибки переходим к билету
        }
      }

      setSearchParams({ ticket: saved.ticketNumber });
      setTimeout(() => {
        handleSelectTab(2);
      }, 300);
    },
  });

  const handleCompleteFlow = useCallback(
    (data: ReadingDnaInputData) => {
      const payload: ReadingDnaInputData = user
        ? data
        : { ...data, guestToken: getOrCreateDnaGuestToken() };
      saveMutation.mutate(payload);
    },
    [saveMutation, user]
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

  // Скачивание билета в PNG (HD) или вертикальной карточки Stories (540×960 ×2 = 1080×1920)
  const handleDownloadTicket = useCallback(
    async (format: "ticket" | "stories" = "ticket") => {
      const element = format === "stories" ? storyCardRef.current : ticketCardRef.current;
      if (!element || !activeTicket) return;

      const originalSrc = new Map<HTMLImageElement, string>();
      setDownloadingFormat(format);

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
          ...(format === "stories" ? { width: 540, height: 960 } : {}),
          backgroundColor: theme === "dark" ? "#2b1d14" : "#fffdf7",
        });

        const link = document.createElement("a");
        link.download =
          format === "stories"
            ? `bookstrata-stories-${activeTicket.ticketNumber}.png`
            : `bookstrata-ticket-${activeTicket.ticketNumber}.png`;
        link.href = dataUrl;
        link.click();

        apiTrackEvent("dna_shared", {
          ticketNumber: activeTicket.ticketNumber,
          method: format === "stories" ? "png_stories" : "png_ticket",
        });
        pushDataLayerEvent("dna_shared", {
          method: format === "stories" ? "png_stories" : "png_ticket",
        });

        sileo.success({
          title: format === "stories" ? "Карточка для Stories сохранена" : "Билет сохранён",
          description:
            format === "stories"
              ? "Вертикальный PNG 1080×1920 скачан."
              : "PNG в HD-качестве скачан.",
        });
      } catch {
        sileo.error({
          title: "Не удалось скачать изображение",
          description: "Попробуйте ещё раз.",
        });
      } finally {
        for (const [img, src] of originalSrc) {
          img.src = src;
        }
        setDownloadingFormat(null);
      }
    },
    [activeTicket, theme]
  );

  const handleCopyLink = useCallback(async () => {
    const num = activeTicket?.ticketNumber || "BS-04821";
    const url = `${window.location.origin}/reading-dna?challenge=${num}`;
    try {
      await navigator.clipboard.writeText(url);
      if (activeTicket?.ticketNumber) {
        shareReadingTicket(activeTicket.ticketNumber).catch(() => {});
      }
      apiTrackEvent("dna_shared", {
        ticketNumber: num,
        method: "copy_challenge_link",
      });
      pushDataLayerEvent("dna_shared", { method: "copy_challenge_link" });
      sileo.success({
        title: "Ссылка для сравнения вкусов скопирована",
        description: "Отправьте друзьям в книжный чат!",
      });
    } catch {
      // Fallback
    }
  }, [activeTicket]);

  const handleOpenBukstrazh = useCallback(() => {
    if (!user) {
      sileo.info({
        title: "Войдите, чтобы пообщаться с Букстражем",
        description: "AI-библиотекарь разберёт ваш ДНК и подберёт книги.",
      });
      navigate("/auth?redirect=/reading-dna");
      return;
    }
    setIsAiLibrarianOpen(true);
  }, [user, navigate]);

  const handleCopyTicketNumber = useCallback(async () => {
    if (!activeTicket?.ticketNumber) return;
    try {
      await navigator.clipboard.writeText(activeTicket.ticketNumber);
      sileo.success({
        title: "Номер билета скопирован",
        description: `${activeTicket.ticketNumber} в буфере обмена`,
      });
    } catch {
      // Fallback
    }
  }, [activeTicket]);

  const isDark = theme === "dark";

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0d0907] flex items-center justify-center text-amber-200/60">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div
      data-dna-theme={isDark ? "dark" : "light"}
      className="min-h-screen w-full max-w-full overflow-x-hidden transition-colors duration-500 py-2 sm:py-4 px-2 sm:px-6 lg:px-8 flex flex-col"
      style={{
        background: isDark
          ? "radial-gradient(900px 500px at 50% -10%, rgba(255, 190, 100, 0.18), transparent 70%), #1a110c"
          : "linear-gradient(rgba(59, 110, 168, 0.12) 1px, transparent 1px) 0 0 / 100% 28px, linear-gradient(90deg, rgba(59, 110, 168, 0.1) 1px, transparent 1px) 0 0 / 28px 100%, #fbf8f2",
        color: isDark ? "#efe3cc" : "#2e2a24",
      }}
    >
      <SEOHead
        title={
          challengeParam
            ? `Сравнение читательского вкуса: билет #${challengeParam} — BookStrata`
            : ticketParam && activeTicket?.archetypeName
            ? `Читательский билет: ${activeTicket.archetypeName} (${activeTicket.ticketNumber}) — Книжный ДНК | BookStrata`
            : "Книжный ДНК: тест «Какой я читатель» и читательский билет — BookStrata"
        }
        description={
          challengeParam
            ? `Сравните читательские вкусы на BookStrata с билетом #${challengeParam}. Узнайте совместимость и литературный резонанс!`
            : ticketParam && activeTicket?.archetypeName
            ? `Читательский билет ${activeTicket.ticketNumber} на BookStrata. Архетип: ${activeTicket.archetypeName}. Расшифруйте свой книжный ДНК или сравните вкусы с друзьями!`
            : "Узнайте, какой вы читатель — пройдите тест «Какой я читатель» на BookStrata. Получите персональный читательский билет, расшифруйте книжный ДНК по 6 осям и сравните вкусы с друзьями."
        }
        image="/og-reading-dna.webp"
        breadcrumbs={[{ name: "Главная", url: "/" }, { name: "Книжный ДНК", url: "/reading-dna" }]}
        url="/reading-dna"
        noindex={Boolean(ticketParam || challengeParam)}
      />

      <div className="w-full max-w-full flex flex-col flex-1">

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
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.98] cursor-pointer shadow-xs group ${
              isDark
                ? "border-[rgba(201,163,91,0.3)] bg-[#24170f]/70 hover:bg-[#c9a35b]/20 text-[#efe3cc]"
                : "border-[rgba(59,110,168,0.3)] bg-white/80 hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
            }`}
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Назад</span>
          </button>
        </div>

        {/* ШАПКА ПАПКИ */}
        <header
          className="sticky top-0 z-30 w-full max-w-full grid grid-cols-[1fr_auto] md:flex md:items-end md:justify-between gap-x-2 gap-y-1 sm:gap-y-1.5 md:gap-3 pt-1.5 sm:pt-2 pb-0 backdrop-blur-md transition-colors"
          style={{
            backgroundColor: isDark ? "rgba(26, 17, 12, 0.94)" : "rgba(251, 248, 242, 0.94)",
          }}
        >
          {/* Заголовок страницы: картинка для тёмного ночного архива, рукописный текст для светлой крафтовой анкеты */}
          <div className="leading-none select-none flex items-center col-start-1 row-start-1 min-w-0">
            {isDark ? (
              <span className="relative z-20 -mb-2 sm:-mb-6 flex items-center">
                <span className="sr-only">Книжный ДНК</span>
                <img
                  src="/images/reading-dna/DNA.webp"
                  alt="Книжный ДНК"
                  width={290}
                  height={92}
                  fetchPriority="high"
                  decoding="async"
                  className="h-9 sm:h-16 md:h-20 w-auto max-w-32.5 sm:max-w-65 md:max-w-72.5 object-contain drop-shadow-md transition-transform"
                />
              </span>
            ) : (
              <span className="pb-1 pr-1.5 text-2xl sm:text-4xl font-bold tracking-tight leading-none font-['Caveat',cursive] text-[#2e2a24] whitespace-nowrap">
                Книжный ДНК
              </span>
            )}
          </div>

          {/* Анимированный переключатель темы (на мобильных справа вверху, на десктопе справа) */}
          <div className="col-start-2 row-start-1 md:order-last flex items-center justify-end shrink-0">
            <motion.button
              type="button"
              onClick={toggleTheme}
              whileHover={{ rotate: 180, scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
              aria-label={isDark ? "Переключить на крафтовую анкету" : "Переключить на ночной архив"}
              title={isDark ? "Светлая крафтовая анкета" : "Темный ночной архив"}
              className="cursor-pointer bg-transparent border-0 p-1 text-lg sm:text-2xl leading-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
            >
              <span className="inline-block will-change-transform drop-shadow-sm">
                {isDark ? "☀️" : "🌙"}
              </span>
            </motion.button>
          </div>

          {/* Закладки папки — на мобильных на всю ширину со скроллом, на десктопе сдвинуты вправо */}
          <div className="col-span-2 row-start-2 md:col-auto md:row-auto w-full md:w-auto min-w-0 max-w-full overflow-x-auto scrollbar-none -mb-px flex items-end md:ml-auto md:justify-end">
            <nav
              aria-label="Архивные разделы"
              className="flex items-end gap-1 sm:gap-1.5 select-none relative z-10 min-w-max px-0.5"
            >
              {DOC_TABS.map((tab, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (isActive && idx === 3) {
                        handleResetDuel();
                      } else {
                        handleSelectTab(idx);
                      }
                    }}
                    className={`px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm rounded-t-lg sm:rounded-t-xl border-t border-x border-b-0 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                      isActive
                        ? isDark
                          ? "bg-[#2a1a10] border-[rgba(201,163,91,0.45)] text-[#efe3cc] font-semibold relative z-20 shadow-xs"
                          : "bg-[#e8d5ad] border-[rgba(59,110,168,0.45)] text-[#2e2a24] font-semibold relative z-20 shadow-xs"
                        : isDark
                          ? "bg-[#2b1d14] border-[rgba(201,163,91,0.25)] text-[#a89678] hover:text-[#efe3cc] hover:bg-[#352318] relative z-10"
                          : "bg-[#fffdf7] border-[rgba(59,110,168,0.25)] text-[#6f6553] hover:text-[#2e2a24] hover:bg-white relative z-10"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ОСНОВНАЯ ПАПКА */}
        <main
          className={`rounded-b-xl sm:rounded-b-2xl rounded-tr-xl sm:rounded-tr-2xl border p-2.5 sm:p-5 shadow-2xl transition-all duration-300 flex-1 ${
            isDark
              ? "bg-[#2a1a10] border-[rgba(201,163,91,0.35)]"
              : "bg-[#e8d5ad] border-[rgba(59,110,168,0.35)]"
          }`}
        >
          {activeTab === 0 && (
            <motion.section
              key="doc-intro"
              id="doc-intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="relative pt-3 sm:pt-4"
            >
                <div
                  className={`inline-block px-2.5 sm:px-3.5 py-0.5 sm:py-1 -mb-1 ml-2 sm:ml-4 relative z-20 text-white text-[11px] sm:text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Манифест — О проекте
                </div>

                <div
                  className={`rounded-lg border p-3 sm:p-6 md:p-8 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  <DnaIntroSection
                    archetypes={archetypes}
                    theme={theme}
                    userTicket={activeTicket}
                    onStartTest={() => handleSelectTab(1)}
                    onOpenDuel={() => handleSelectTab(3)}
                    onGoToTicket={() => handleSelectTab(2)}
                  />
                </div>
              </motion.section>
            )}

            {activeTab === 1 && (
              <motion.section
                key="doc-0"
                id="doc-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="relative pt-3 sm:pt-4"
              >
                <div className="flex items-center justify-between -mb-1 ml-2 sm:ml-4 mr-2 relative z-20">
                  <div
                    className={`inline-block px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-white text-[11px] sm:text-xs font-semibold rounded-t-sm shadow-xs ${
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
                  className={`rounded-lg border p-3.5 sm:p-6 md:p-7 shadow-md grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 items-start ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  {/* Левая колонка: форма опросника */}
                  <div className="flex flex-col justify-between">
                    {opponentTicket && (
                      <div
                        className={`mb-3 sm:mb-4 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 select-none shadow-xs ${
                          isDark
                            ? "bg-[#8a2433]/30 border-rose-500/40 text-rose-200"
                            : "bg-[#b3412f]/10 border-rose-500/30 text-[#b3412f]"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Swords size={16} className="shrink-0" />
                          <span>Дуэль против {opponentTicket.customName || "Читателя"} (#{opponentTicket.ticketNumber})</span>
                        </span>
                        <span className="text-[10px] opacity-75 hidden sm:inline">
                          Карты соперника вскроются после запечатывания
                        </span>
                      </div>
                    )}
                    <DnaStepFlow
                      theme={theme}
                      onComplete={handleCompleteFlow}
                      onAxisChange={handleLiveAxisChange}
                      onBooksChange={handleBooksChange}
                      onStepChange={setCurrentStep}
                      onTouchedAxesChange={setTouchedAxes}
                      onNameChange={setCustomName}
                      initialName={customName}
                      initialStep={initialDraft.step}
                      initialAxes={initialDraft.axes}
                      initialBooks={initialDraft.favoriteBooks}
                      initialKryptonite={initialDraft.kryptonite}
                      initialTouchedAxes={initialDraft.touchedAxes}
                      isLoading={saveMutation.isPending}
                    />
                  </div>

                  {/* Правая колонка: Live-превью билета */}
                  <div className="flex flex-col justify-center space-y-2 sm:space-y-2.5">
                    <ArchivalTicketCard
                      ticketNumber={activeTicket?.ticketNumber || "BS-....."}
                      customName={customName || activeTicket?.customName || null}
                      archetypeName={activeTicket?.archetypeName || ""}
                      axes={liveAxes}
                      favoriteBooks={liveBooks}
                      kryptoniteBook={liveKryptonite}
                      theme={theme}
                      isSealed={Boolean(activeTicket)}
                    />
                    <span className="block text-[10px] sm:text-[11px] opacity-60 text-center font-sans">
                      Номер BS-XXXXX выдаётся по порядку при запечатывании.
                    </span>
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === 2 && (
              <motion.section
                key="doc-1"
                id="doc-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="relative pt-2"
              >
                <div
                  className={`inline-block px-2.5 sm:px-3.5 py-0.5 sm:py-1 -mb-1 ml-2 sm:ml-4 relative z-20 text-white text-[11px] sm:text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Документ II — Читательский билет
                </div>

                <div
                  className={`rounded-lg border p-2 sm:p-3.5 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  {activeTicket ? (
                    <div className="space-y-3.5">
                      {isViewingOtherTicket && (
                        <div
                          className={`flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-xl border text-xs ${
                            isDark
                              ? "bg-[#2b1d14] border-[rgba(201,163,91,0.4)] text-[#efe3cc]"
                              : "bg-white border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-amber-500">Билет читателя:</span>
                            <span className="font-bold">{activeTicket.customName || activeTicket.ticketNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectTab(3)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                isDark
                                  ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                                  : "bg-[#b3412f] hover:bg-[#c94935]"
                              }`}
                            >
                              <Compass size={13} />
                              <span>Сравнить вкусы</span>
                            </button>
                            {Boolean(myDna || currentTicket) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchParams({});
                                  handleSelectTab(2);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-current/20 hover:bg-black/10 transition-colors cursor-pointer"
                              >
                                К моему билету
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="w-full">
                        <div ref={ticketCardRef}>
                          <ArchivalTicketCard
                            ticketNumber={activeTicket.ticketNumber}
                            customName={activeTicket.customName}
                            archetypeName={activeTicket.archetypeName}
                            rarityPercent={
                              archetypeStats && archetypeStats.totalTickets > 0
                                ? archetypeStats.distribution[activeTicket.archetype]?.percent ?? null
                                : null
                            }
                            axes={activeTicket.axes}
                            favoriteBooks={activeTicket.favoriteBooks}
                            kryptoniteBook={activeTicket.kryptoniteBook}
                            theme={theme}
                            isSealed={true}
                          />
                        </div>

                        {/* Кнопки под билетом */}
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center sm:justify-start gap-2 pt-3 sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleDownloadTicket("ticket")}
                            disabled={downloadingFormat !== null}
                            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                              isDark
                                ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                                : "bg-[#b3412f] hover:bg-[#c94935]"
                            }`}
                          >
                            {downloadingFormat === "ticket" ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Готовим PNG...</span>
                              </>
                            ) : (
                              <span>Скачать в HD (PNG)</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadTicket("stories")}
                            disabled={downloadingFormat !== null}
                            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                              isDark
                                ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc] hover:bg-[#c9a35b]/15"
                                : "bg-white border-[rgba(59,110,168,0.35)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
                            }`}
                          >
                            {downloadingFormat === "stories" ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Готовим 9:16...</span>
                              </>
                            ) : (
                              <span>Для Stories (9:16)</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center justify-center ${
                              isDark
                                ? "bg-[#2b1d14] border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/10"
                                : "bg-white border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
                            }`}
                          >
                            <span>Скопировать ссылку</span>
                          </button>

                          {isViewingOtherTicket ? (
                            <button
                              type="button"
                              onClick={() => handleSelectTab(3)}
                              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold text-white shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                                isDark
                                  ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                                  : "bg-[#b3412f] hover:bg-[#c94935]"
                              }`}
                            >
                              <Compass size={13} />
                              <span>Сравнить архетипы</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectTab(3)}
                              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center justify-center ${
                                isDark
                                  ? "bg-[#2b1d14] border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/10"
                                  : "bg-white border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
                              }`}
                            >
                              <span>Сравнить с другом</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Скрытый контейнер 540×960 для экспорта в Stories 9:16 (×2 = 1080×1920) */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: "fixed",
                          left: -9999,
                          top: 0,
                          pointerEvents: "none",
                          zIndex: -1,
                        }}
                      >
                        <div ref={storyCardRef}>
                          <StoryTicketCard
                            ticketNumber={activeTicket.ticketNumber}
                            customName={activeTicket.customName}
                            archetypeName={activeTicket.archetypeName}
                            motto={activeTicket.motto}
                            axes={activeTicket.axes}
                            favoriteBooks={activeTicket.favoriteBooks}
                            kryptoniteBook={activeTicket.kryptoniteBook}
                            theme={theme}
                          />
                        </div>
                      </div>

                      {/* Мост в каталог (Book Match) + Букстраж */}
                      <DnaBookMatchBridge
                        axes={activeTicket.axes}
                        theme={theme}
                        onOpenBukstrazh={handleOpenBukstrazh}
                      />

                      {/* Журнал дуэлей: входящие и исходящие сравнения вкусов */}
                      <DnaDuelsJournal
                        ticketNumber={activeTicket.ticketNumber}
                        isOtherTicket={isViewingOtherTicket}
                        theme={theme}
                        onCopyChallengeLink={handleCopyLink}
                        onOpenDuel={handleOpenDuelWith}
                      />

                      {/* Книжные близнецы: реальные читатели с похожим вкусом */}
                      <DnaTwinsSection
                        ticketNumber={activeTicket.ticketNumber}
                        theme={theme}
                      />

                      {/* Архивные карточки: Редкость и Анатомия билета */}
                      {(() => {
                        const arch =
                          findArchetypeByIdOrName(archetypes, activeTicket.archetypeName) ||
                          resolveArchetypeByRanges(archetypes, activeTicket.axes);
                        const luckySum = activeTicket.ticketNumber
                          .replace(/\D/g, "")
                          .split("")
                          .reduce((acc, d) => acc + parseInt(d, 10), 0);
                        const dbEntry =
                          archetypeStats && archetypeStats.totalTickets > 0
                            ? archetypeStats.distribution[activeTicket.archetype] ||
                              (arch?.id ? archetypeStats.distribution[arch.id] : undefined)
                            : undefined;
                        const displayPercent = dbEntry
                          ? Number.isInteger(dbEntry.percent)
                            ? String(dbEntry.percent)
                            : dbEntry.percent.toFixed(1)
                          : String(arch?.rarity || 7);

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-2">
                            {/* Карточка 1: Редкость ранга */}
                            <div
                              className={`p-3.5 sm:p-5 rounded-xl border flex flex-col justify-between space-y-2.5 sm:space-y-3 ${
                                isDark
                                  ? "bg-[#2b1d14]/70 border-[rgba(201,163,91,0.25)] text-[#efe3cc]"
                                  : "bg-white/80 border-[rgba(59,110,168,0.25)] text-[#2e2a24]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] sm:text-xs uppercase font-mono tracking-wider opacity-60">
                                  Редкость архетипа
                                </span>
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                                    isDark
                                      ? "bg-[#8a2433]/30 border-rose-500/40 text-rose-300"
                                      : "bg-[#b3412f]/10 border-rose-500/30 text-[#b3412f]"
                                  }`}
                                >
                                  {displayPercent}%
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                                {dbEntry && archetypeStats ? (
                                  <>
                                    Среди <b>{archetypeStats.totalTickets}</b> читателей BookStrata ранг «
                                    <b>
                                      {isDark
                                        ? arch?.names.dark || activeTicket.archetypeName
                                        : arch?.names.craft || activeTicket.archetypeName}
                                    </b>
                                    » получили <b>{dbEntry.count}</b> ({displayPercent}%).
                                  </>
                                ) : (
                                  <>
                                    Из 1000 читателей лишь ~
                                    <b>{(arch?.rarity || 7) * 10}</b> получают ранг «
                                    <b>
                                      {isDark
                                        ? arch?.names.dark || activeTicket.archetypeName
                                        : arch?.names.craft || activeTicket.archetypeName}
                                    </b>
                                    ».
                                  </>
                                )}
                              </p>
                              {arch?.quote && (
                                <p
                                  className={`text-[11px] sm:text-xs italic font-serif border-l-2 pl-2.5 sm:pl-3 ${
                                    isDark
                                      ? "border-[#c9a35b] text-[#c9a35b]/90"
                                      : "border-[#3b6ea8] text-[#3b6ea8]/90"
                                  }`}
                                >
                                  {formatQuote(arch.quote)}
                                </p>
                              )}
                            </div>

                            {/* Карточка 2: Что внутри билета */}
                            <div
                              className={`p-3.5 sm:p-5 rounded-xl border space-y-2 sm:space-y-2.5 text-xs ${
                                isDark
                                  ? "bg-[#2b1d14]/70 border-[rgba(201,163,91,0.25)] text-[#efe3cc]"
                                  : "bg-white/80 border-[rgba(59,110,168,0.25)] text-[#2e2a24]"
                              }`}
                            >
                              <div className="text-[11px] sm:text-xs uppercase font-mono tracking-wider opacity-60 mb-1">
                                Анатомия билета
                              </div>
                              <ul className="space-y-1.5 leading-relaxed opacity-85 text-[11px] sm:text-xs">
                                <li>
                                  <b className="opacity-100">№ билета:</b> номер{" "}
                                  <button
                                    type="button"
                                    onClick={handleCopyTicketNumber}
                                    className="font-mono font-bold underline cursor-pointer hover:opacity-100 inline-flex items-center gap-1"
                                    title="Нажмите, чтобы скопировать номер билета"
                                  >
                                    {activeTicket.ticketNumber}
                                    <Copy size={11} className="opacity-70" />
                                  </button>
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
                                  <b className="opacity-100">QR-код:</b> прямая ссылка на сравнение читательского вкуса.
                                </li>
                              </ul>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* НАЧАЛЬНОЕ СОСТОЯНИЕ ДОКУМЕНТА II (В ТОЧНОСТИ КАК НА СКРИНШОТЕ!) */
                    <div className="py-6 sm:py-8 px-3 sm:px-4 text-center max-w-md mx-auto space-y-2.5 sm:space-y-3">
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
                        onClick={() => handleSelectTab(1)}
                        className={`px-5 sm:px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
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

            {activeTab === 3 && (
              <motion.section
                key="doc-2"
                id="doc-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="relative pt-3 sm:pt-4"
              >
                <div
                  className={`inline-block px-2.5 sm:px-3.5 py-0.5 sm:py-1 -mb-1 ml-2 sm:ml-4 relative z-20 text-white text-[11px] sm:text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Документ III — Сравнение вкусов
                </div>

                <div
                  className={`rounded-lg border p-3.5 sm:p-6 md:p-7 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  <DuelSection
                    myTicket={currentTicket}
                    opponentTicket={opponentTicketNumber ? opponentTicket : null}
                    opponentTicketNumber={opponentTicketNumber}
                    initialDuelResult={initialDuelResult}
                    theme={theme}
                    onGoToTest={() => handleSelectTab(1)}
                    onResetDuel={handleResetDuel}
                  />
                </div>
              </motion.section>
            )}

            {activeTab === 4 && (
              <motion.section
                key="doc-3"
                id="doc-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="relative pt-3 sm:pt-4"
              >
                <div
                  className={`inline-block px-2.5 sm:px-3.5 py-0.5 sm:py-1 -mb-1 ml-2 sm:ml-4 relative z-20 text-white text-[11px] sm:text-xs font-semibold rounded-t-sm shadow-xs ${
                    isDark ? "bg-[#8a2433]" : "bg-[#b3412f]"
                  }`}
                >
                  Документ IV — Витрина
                </div>

                <div
                  className={`rounded-lg border p-3.5 sm:p-6 md:p-7 shadow-md ${
                    isDark
                      ? "bg-[#35261b] border-[rgba(201,163,91,0.35)]"
                      : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)]"
                  }`}
                >
                  <HubSection theme={theme} />
                </div>
              </motion.section>
            )}
        </main>
      </div>

      {user && isAiLibrarianOpen && (
        <AiLibrarianModal
          isOpen={isAiLibrarianOpen}
          onClose={() => setIsAiLibrarianOpen(false)}
          context={
            activeTicket
              ? {
                  pageType: "reading-dna",
                  ticketNumber: activeTicket.ticketNumber,
                }
              : undefined
          }
          variant="sidebar"
        />
      )}
    </div>
  );
}
