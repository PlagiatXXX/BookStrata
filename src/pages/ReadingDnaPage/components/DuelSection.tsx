import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  Swords,
  Lock,
  Unlock,
  Share2,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  X,
  Download,
  Smartphone,
  Loader2,
  Star,
  ExternalLink,
} from "lucide-react";
import { sileo } from "sileo";
import type {
  ReadingDnaResponseData,
  ReadingDnaDuelResultData,
  CelebrityDnaProfileData,
} from "@/lib/readingDnaApi";
import {
  conductReadingDuel,
  getReadingTicket,
  getReadingCelebrities,
  conductCelebrityDuel,
} from "@/lib/readingDnaApi";
import { apiTrackEvent } from "@/lib/analyticsApi";
import { pushDataLayerEvent } from "@/lib/gtm";
import { DuelExportCard } from "./DuelExportCard";

export interface DuelSectionProps {
  myTicket: ReadingDnaResponseData | null;
  opponentTicket?: ReadingDnaResponseData | null;
  opponentTicketNumber?: string | null;
  initialDuelResult?: ReadingDnaDuelResultData | null;
  theme?: "dark" | "craft" | "light";
  onGoToTest: () => void;
  onResetDuel?: () => void;
  className?: string;
}

const AXIS_NAMES = [
  "Рефлексия",
  "Тяжесть",
  "Погружение",
  "Мрачность",
  "Эпика",
  "Глубина",
];

// Маппинг визуально идентичных кириллических букв на латиницу на случай русской раскладки
const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: "A",
  В: "B",
  С: "C",
  Е: "E",
  Н: "H",
  К: "K",
  М: "M",
  О: "O",
  Р: "P",
  Т: "T",
  Х: "X",
  У: "Y",
};

/**
 * Строгая маска суффикса билета: ровно 4 цифры, дефис, ровно 1 латинская буква (цифры после дефиса запрещены).
 * Пример: "7492-A"
 */
function formatTicketSuffix(rawInput: string): string {
  let val = rawInput.toUpperCase().replace(/\s+/g, "");
  if (val.startsWith("BS-")) val = val.slice(3);
  else if (val.startsWith("BS")) val = val.slice(2);

  // Транслитерируем кириллические опечатки
  val = val.replace(/[А-ЯЁ]/g, (ch) => CYRILLIC_TO_LATIN[ch] || "");

  let digits = "";
  let letter = "";
  let hasHyphen = false;

  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (digits.length < 4) {
      if (/[0-9]/.test(char)) {
        digits += char;
      }
    } else {
      if (char === "-") {
        hasHyphen = true;
      } else if (/[A-Z]/.test(char)) {
        letter = char; // Строго английская буква, цифры запрещены!
        break;
      }
    }
  }

  if (digits.length < 4) {
    return digits;
  }

  if (!letter) {
    return hasHyphen ? `${digits}-` : digits;
  }

  return `${digits}-${letter}`;
}

function isCompleteTicketSuffix(suffix: string): boolean {
  return /^\d{4}-[A-Z]$/.test(suffix);
}

export function DuelSection({
  myTicket,
  opponentTicket: initialOpponentTicket = null,
  opponentTicketNumber = null,
  initialDuelResult = null,
  theme = "dark",
  onGoToTest,
  onResetDuel,
  className = "",
}: DuelSectionProps) {
  const isDark = theme === "dark";

  const [inputTicketSuffix, setInputTicketSuffix] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const [copiedMyNumber, setCopiedMyNumber] = useState(false);

  const [opponent, setOpponent] = useState<ReadingDnaResponseData | null>(
    initialOpponentTicket
  );
  const [duelResult, setDuelResult] = useState<ReadingDnaDuelResultData | null>(
    initialDuelResult
  );
  const [downloadingFormat, setDownloadingFormat] = useState<"card" | "stories" | null>(null);
  const [celebrities, setCelebrities] = useState<CelebrityDnaProfileData[]>([]);
  const [loadingCelebritySlug, setLoadingCelebritySlug] = useState<string | null>(null);
  const [activeCelebritySlug, setActiveCelebritySlug] = useState<string | null>(null);
  const duelCardRef = useRef<HTMLDivElement>(null);
  const duelStoryRef = useRef<HTMLDivElement>(null);
  const autoDuelRunRef = useRef<string | null>(null);
  const dismissedOpponentRef = useRef<string | null>(null);

  // Сброс блокировок при очистке оппонента из пропсов
  useEffect(() => {
    if (!opponentTicketNumber && !initialOpponentTicket) {
      autoDuelRunRef.current = null;
      dismissedOpponentRef.current = null;
    }
  }, [opponentTicketNumber, initialOpponentTicket]);

  // Загружаем реальных знаменитостей из БД BookStrata, когда у пользователя есть билет
  useEffect(() => {
    if (!myTicket) return;
    let cancelled = false;
    getReadingCelebrities()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setCelebrities(list);
        }
      })
      .catch(() => {
        // Тихо скрываем блок знаменитостей при сетевой ошибке
      });
    return () => {
      cancelled = true;
    };
  }, [myTicket]);

  // Копирование собственного номера билета
  const handleCopyMyTicketNumber = useCallback(() => {
    if (!myTicket?.ticketNumber) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(myTicket.ticketNumber);
      setCopiedMyNumber(true);
      setTimeout(() => setCopiedMyNumber(false), 2200);
    }
  }, [myTicket]);

  const handleTicketSuffixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTicketSuffix(e.target.value);
    setInputTicketSuffix(formatted);
    setErrorMsg(null);
  }, []);

  // Сравнение вкусов по номеру билета оппонента
  const handleRunDuelWithTarget = useCallback(
    async (rawSuffix: string) => {
      const cleanSuffix = formatTicketSuffix(rawSuffix);
      if (!isCompleteTicketSuffix(cleanSuffix)) {
        setErrorMsg("Введите полный шифр билета (4 цифры и 1 буква, например 7492-A)");
        return;
      }
      const cleanTarget = `BS-${cleanSuffix}`;

      if (myTicket && myTicket.ticketNumber.toUpperCase() === cleanTarget.toUpperCase()) {
        setErrorMsg("Нельзя сравнить вкус со своим собственным билетом");
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        // Загружаем данные оппонента для отображения
        const fetchedOpponent = await getReadingTicket(cleanTarget);
        setOpponent(fetchedOpponent);

        if (myTicket) {
          const result = await conductReadingDuel({
            targetTicketNumber: cleanTarget,
            challengerTicketNumber: myTicket.ticketNumber,
          });
          setDuelResult(result);
        }
      } catch {
        setErrorMsg(`Билет с номером «${cleanTarget}» не найден в Архиве. Проверьте код.`);
      } finally {
        setIsLoading(false);
      }
    },
    [myTicket]
  );

  // Автоматический расчет дуэли, если оппонент передан из URL или Журнала дуэлей
  useEffect(() => {
    const oppCode = initialOpponentTicket?.ticketNumber || opponentTicketNumber;
    if (!oppCode || !myTicket || duelResult || isLoading) return;
    if (oppCode.toUpperCase() === myTicket.ticketNumber.toUpperCase()) return;
    if (dismissedOpponentRef.current === oppCode.toUpperCase()) return;
    if (autoDuelRunRef.current === oppCode.toUpperCase()) return;

    autoDuelRunRef.current = oppCode.toUpperCase();
    handleRunDuelWithTarget(oppCode);
  }, [
    initialOpponentTicket?.ticketNumber,
    opponentTicketNumber,
    myTicket,
    duelResult,
    isLoading,
    handleRunDuelWithTarget,
  ]);

  // Сравнение с вводом своего номера билета (если у пользователя уже есть билет, но он не в стейте)
  const handleExistingTicketDuel = useCallback(async () => {
    const targetCode = opponent?.ticketNumber || opponentTicketNumber;
    if (!targetCode) return;

    const cleanSuffix = formatTicketSuffix(inputTicketSuffix);
    if (!isCompleteTicketSuffix(cleanSuffix)) {
      setErrorMsg("Введите полный шифр билета (4 цифры и 1 буква, например 7492-A)");
      return;
    }
    const myCode = `BS-${cleanSuffix}`;

    if (myCode.toUpperCase() === targetCode.toUpperCase()) {
      setErrorMsg("Нельзя сравнить вкус со своим собственным билетом");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await conductReadingDuel({
        targetTicketNumber: targetCode,
        challengerTicketNumber: myCode,
      });
      setDuelResult(result);
    } catch {
      setErrorMsg("Не удалось найти билет с таким номером. Проверьте код билета.");
    } finally {
      setIsLoading(false);
    }
  }, [opponent, opponentTicketNumber, inputTicketSuffix]);

  // Копирование ссылки для сравнения вкусов
  const handleCopyChallenge = useCallback(() => {
    if (!myTicket) return;
    const challengeUrl = `${window.location.origin}/reading-dna?challenge=${myTicket.ticketNumber}`;
    const textToShare = `Сравни наши литературные вкусы на BookStrata: ${challengeUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToShare);
      setCopiedChallenge(true);
      setTimeout(() => setCopiedChallenge(false), 2500);
    }
  }, [myTicket]);

  // Вычисление конкретной книги криптонит-конфликта (святыня одного = криптонит другого)
  const conflictBookTitle = useMemo(() => {
    if (!duelResult?.breakdown?.kryptoniteConflict) return null;
    const norm = (s?: string | null) => (s || "").trim().toLowerCase();

    if (opponent?.kryptoniteBook && myTicket?.favoriteBooks?.length) {
      const kTitle = norm(opponent.kryptoniteBook.title);
      const kId = opponent.kryptoniteBook.bookId;
      const hit = myTicket.favoriteBooks.find(
        (b) => (kId && b.bookId && b.bookId === kId) || (kTitle && norm(b.title) === kTitle)
      );
      if (hit) return hit.title;
    }
    if (myTicket?.kryptoniteBook && opponent?.favoriteBooks?.length) {
      const kTitle = norm(myTicket.kryptoniteBook.title);
      const kId = myTicket.kryptoniteBook.bookId;
      const hit = opponent.favoriteBooks.find(
        (b) => (kId && b.bookId && b.bookId === kId) || (kTitle && norm(b.title) === kTitle)
      );
      if (hit) return hit.title;
    }
    return opponent?.kryptoniteBook?.title || myTicket?.kryptoniteBook?.title || null;
  }, [duelResult, myTicket, opponent]);

  // Скачивание визуальной карточки результата дуэли (PNG или Stories 9:16)
  const handleDownloadDuel = useCallback(
    async (format: "card" | "stories") => {
      const element = format === "stories" ? duelStoryRef.current : duelCardRef.current;
      if (!element || !duelResult) return;

      setDownloadingFormat(format);
      try {
        const { toPng } = await import("html-to-image");
        if (document.fonts) {
          await document.fonts.ready;
        }
        await new Promise((resolve) => setTimeout(resolve, 60));

        const dataUrl = await toPng(element, {
          cacheBust: true,
          pixelRatio: 2,
          width: format === "stories" ? 540 : 600,
          height: format === "stories" ? 960 : 760,
          backgroundColor: isDark ? "#1a110c" : "#fbf8f2",
        });

        const myNum = myTicket?.ticketNumber || "me";
        const oppNum = opponent?.ticketNumber || opponentTicketNumber || "friend";
        const link = document.createElement("a");
        link.download =
          format === "stories"
            ? `bookstrata-duel-stories-${myNum}-vs-${oppNum}.png`
            : `bookstrata-duel-${myNum}-vs-${oppNum}.png`;
        link.href = dataUrl;
        link.click();

        apiTrackEvent("dna_shared", {
          ticketNumber: myTicket?.ticketNumber,
          method: format === "stories" ? "png_duel_stories" : "png_duel_card",
          compatibility: duelResult.compatibility,
        });
        pushDataLayerEvent("dna_shared", {
          method: format === "stories" ? "png_duel_stories" : "png_duel_card",
          compatibility: duelResult.compatibility,
        });

        sileo.success({
          title: format === "stories" ? "Карточка дуэли для Stories сохранена" : "Карточка дуэли сохранена",
          description:
            format === "stories"
              ? "Вертикальный PNG 1080×1920 скачан."
              : "PNG в HD-качестве скачан.",
        });
      } catch {
        sileo.error({
          title: "Не удалось сохранить карточку дуэли",
          description: "Попробуйте ещё раз.",
        });
      } finally {
        setDownloadingFormat(null);
      }
    },
    [duelResult, isDark, myTicket, opponent, opponentTicketNumber]
  );

  // Копирование результата сравнения с постоянной ссылкой на дуэль
  const handleCopyResult = useCallback(() => {
    if (!duelResult) return;
    const oppNumber = opponent?.ticketNumber || opponentTicketNumber;
    const shareUrl =
      myTicket?.ticketNumber && oppNumber
        ? `${window.location.origin}/reading-dna?compare=${myTicket.ticketNumber}&with=${oppNumber}`
        : myTicket?.ticketNumber
          ? `${window.location.origin}/reading-dna?challenge=${myTicket.ticketNumber}`
          : window.location.href;
    const textToShare = `Сравнение читательских вкусов на BookStrata: совместимость ${duelResult.compatibility}%! ${duelResult.verdict}\n${shareUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToShare);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2500);
    }
  }, [duelResult, myTicket, opponent, opponentTicketNumber]);

  // Точки радара для пользователя и оппонента
  const radarSize = 220;
  const cx = radarSize / 2;
  const cy = radarSize / 2;
  const radius = 70;

  const userValues = useMemo(() => {
    if (!myTicket) return [50, 50, 50, 50, 50, 50];
    return [
      myTicket.axes.storyFocus || 50,
      myTicket.axes.emotionalWeight || 50,
      myTicket.axes.pace || 50,
      myTicket.axes.darkness || 50,
      myTicket.axes.scope || 50,
      myTicket.axes.complexity || 50,
    ];
  }, [myTicket]);

  const opponentValues = useMemo(() => {
    if (!opponent) return [50, 50, 50, 50, 50, 50];
    return [
      opponent.axes.storyFocus || 50,
      opponent.axes.emotionalWeight || 50,
      opponent.axes.pace || 50,
      opponent.axes.darkness || 50,
      opponent.axes.scope || 50,
      opponent.axes.complexity || 50,
    ];
  }, [opponent]);

  const userRadarPoints = useMemo(() => {
    return userValues
      .map((val, idx) => {
        const angle = (Math.PI / 3) * idx - Math.PI / 2;
        const r = (Math.max(10, val) / 100) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [userValues, cx, cy, radius]);

  const opponentRadarPoints = useMemo(() => {
    return opponentValues
      .map((val, idx) => {
        const angle = (Math.PI / 3) * idx - Math.PI / 2;
        const r = (Math.max(10, val) / 100) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [opponentValues, cx, cy, radius]);

  // ДУЭЛЬ СО ЗНАМЕНИТОСТЬЮ В 1 КЛИК
  const handleRunCelebrityDuel = useCallback(
    async (celeb: CelebrityDnaProfileData) => {
      if (!myTicket || loadingCelebritySlug) return;
      setLoadingCelebritySlug(celeb.slug);
      setErrorMsg(null);
      try {
        const res = await conductCelebrityDuel(celeb.slug, {
          challengerTicketNumber: myTicket.ticketNumber,
        });
        const celebOpponent: ReadingDnaResponseData = {
          id: res.celebrity.id,
          ticketNumber: res.celebrity.name,
          customName: res.celebrity.name,
          archetype: res.celebrity.archetype,
          archetypeName: res.celebrity.archetypeName,
          motto: res.celebrity.motto,
          theme: "dark",
          axes: res.celebrity.axes,
          favoriteBooks: res.celebrity.favoriteBooks,
          kryptoniteBook: res.celebrity.kryptoniteBook,
          likedGenres: res.celebrity.likedGenres,
          dislikedGenres: [],
          favoriteAuthors: res.celebrity.favoriteAuthors,
          viewsCount: 0,
          shareCount: 0,
          duelsCount: 0,
          createdAt: new Date().toISOString(),
        };
        setOpponent(celebOpponent);
        setActiveCelebritySlug(res.celebrity.slug);
        setDuelResult({
          compatibility: res.compatibility,
          verdict: res.verdict,
          targetTicketNumber: res.celebrity.name,
          breakdown: res.breakdown,
        });
        apiTrackEvent("dna_duel", {
          celebritySlug: res.celebrity.slug,
          compatibility: res.compatibility,
        });
        pushDataLayerEvent("dna_duel", {
          celebrity_slug: res.celebrity.slug,
          compatibility: res.compatibility,
        });
      } catch {
        sileo.error({
          title: "Не удалось провести дуэль",
          description: "Попробуйте выбрать знаменитость ещё раз.",
        });
      } finally {
        setLoadingCelebritySlug(null);
      }
    },
    [myTicket, loadingCelebritySlug]
  );

  // СБРОС ДУЭЛИ
  const handleResetDuel = useCallback(() => {
    const currentOpp =
      opponent?.ticketNumber || opponentTicketNumber || initialOpponentTicket?.ticketNumber;
    if (currentOpp) {
      dismissedOpponentRef.current = currentOpp.toUpperCase();
    }
    setDuelResult(null);
    setOpponent(null);
    setActiveCelebritySlug(null);
    setInputTicketSuffix("");
    setErrorMsg(null);
    onResetDuel?.();
  }, [
    opponent?.ticketNumber,
    opponentTicketNumber,
    initialOpponentTicket?.ticketNumber,
    onResetDuel,
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. ЕСЛИ РЕЗУЛЬТАТ ДУЭЛИ ГОТОВ — ЭКРАН ПОБЕДЫ И СОВМЕСТИМОСТИ
  // ═══════════════════════════════════════════════════════════════════════
  if (duelResult) {
    const isKryptoniteConflict = duelResult.breakdown?.kryptoniteConflict;

    return (
      <div className={`space-y-6 max-w-3xl mx-auto ${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl border p-6 sm:p-9 text-center shadow-2xl relative overflow-hidden transition-colors ${
            isDark
              ? "bg-[#2b1d14] border-[rgba(212,175,55,0.45)] text-[#efe3cc]"
              : "bg-[#fffdf7] border-[rgba(59,110,168,0.4)] text-[#2e2a24]"
          }`}
        >
          {/* Верхняя навигация: вернуться ко всем сравнениям */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-current/10">
            <button
              type="button"
              onClick={handleResetDuel}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? "border-[rgba(201,163,91,0.35)] bg-black/20 text-[#efe3cc] hover:bg-[#c9a35b]/15"
                  : "border-[rgba(59,110,168,0.35)] bg-white/70 text-[#2e2a24] hover:bg-[#3b6ea8]/10"
              }`}
            >
              <ArrowLeft size={14} />
              <span>Все сравнения и знаменитости</span>
            </button>

            <span className="text-[11px] font-mono opacity-60">
              #{opponent?.ticketNumber || opponentTicketNumber}
            </span>
          </div>

          {/* Скрещенные мечи и статус */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span
              className={`inline-flex p-3 rounded-full shadow-inner ${
                isKryptoniteConflict
                  ? "bg-rose-500/20 text-rose-400"
                  : isDark
                    ? "bg-[#d4af37]/15 text-[#d4af37]"
                    : "bg-[#3b6ea8]/15 text-[#3b6ea8]"
              }`}
            >
              <Swords size={28} />
            </span>
          </div>

          <span
            className={`block text-[11px] font-mono uppercase tracking-[0.22em] font-extrabold opacity-80 mb-1 ${
              isDark ? "text-[#d4af37]" : "text-[#3b6ea8]"
            }`}
          >
            ИТОГ СРАВНЕНИЯ ВКУСОВ
          </span>

          {/* Большой процент совместимости */}
          <div
            className={`text-6xl sm:text-7xl font-mono font-black tracking-tight my-2 drop-shadow-md ${
              isKryptoniteConflict
                ? "text-rose-400"
                : isDark
                  ? "text-[#f4d03f]"
                  : "text-[#3b6ea8]"
            }`}
          >
            {duelResult.compatibility}%
          </div>

          {/* Авторский вердикт сравнения */}
          <h2
            className={`text-xl sm:text-2xl font-bold mb-3 max-w-xl mx-auto leading-snug ${
              isDark
                ? "font-serif text-[#efe3cc]"
                : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
            }`}
          >
            {duelResult.verdict}
          </h2>

          <p className="text-xs sm:text-sm opacity-75 max-w-md mx-auto mb-4">
            Сравнение вкусов между билетом <b>#{myTicket?.ticketNumber || "Вы"}</b> и{" "}
            <b>#{opponent?.ticketNumber || opponentTicketNumber || "Собеседник"}</b>
          </p>

          {isKryptoniteConflict && (
            <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/45 bg-rose-500/15 text-rose-300 text-xs font-semibold">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                Криптонит-конфликт (−{duelResult.breakdown?.kryptonitePenalty || 25}%)
                {conflictBookTitle ? `: «${conflictBookTitle}»` : ""}
              </span>
            </div>
          )}

          {/* СРАВНЕНИЕ РАДАРОВ ВКУСОВ */}
          <div className="my-6 p-4 rounded-xl border bg-black/10 border-current/10 flex flex-col items-center">
            <div className="relative">
              <svg
                width={radarSize}
                height={radarSize}
                viewBox={`0 0 ${radarSize} ${radarSize}`}
                className="overflow-visible select-none"
              >
                {/* Паутинка */}
                {[0.33, 0.66, 1].map((scale, i) => {
                  const gridPoints = [0, 1, 2, 3, 4, 5]
                    .map((idx) => {
                      const angle = (Math.PI / 3) * idx - Math.PI / 2;
                      const r = radius * scale;
                      return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
                    })
                    .join(" ");

                  return (
                    <polygon
                      key={i}
                      points={gridPoints}
                      fill="none"
                      stroke={isDark ? "rgba(201,163,91,0.25)" : "rgba(59,110,168,0.25)"}
                      strokeWidth="1"
                      strokeDasharray={scale === 1 ? undefined : "2 2"}
                    />
                  );
                })}

                {/* Лучи */}
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const angle = (Math.PI / 3) * idx - Math.PI / 2;
                  const x = cx + radius * Math.cos(angle);
                  const y = cy + radius * Math.sin(angle);
                  return (
                    <line
                      key={idx}
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                      stroke={isDark ? "rgba(201,163,91,0.2)" : "rgba(59,110,168,0.2)"}
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Радар пользователя (золотой/синий) */}
                <polygon
                  points={userRadarPoints}
                  fill={isDark ? "rgba(244,208,63,0.3)" : "rgba(59,110,168,0.25)"}
                  stroke={isDark ? "#f4d03f" : "#3b6ea8"}
                  strokeWidth="2.5"
                />

                {/* Радар оппонента (терракотовый пунктир) */}
                <polygon
                  points={opponentRadarPoints}
                  fill="rgba(181, 101, 29, 0.2)"
                  stroke="#b5651d"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />

                {/* Метки осей */}
                {AXIS_NAMES.map((name, idx) => {
                  const angle = (Math.PI / 3) * idx - Math.PI / 2;
                  const labelDist = radius + 16;
                  const lx = cx + labelDist * Math.cos(angle);
                  const ly = cy + labelDist * Math.sin(angle) + 3;
                  return (
                    <text
                      key={idx}
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      className={`text-[9px] font-mono ${
                        isDark ? "fill-[#d4af37]" : "fill-[#3b6ea8]"
                      }`}
                    >
                      {name}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center gap-6 mt-3 text-xs font-mono opacity-80">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: isDark ? "#f4d03f" : "#3b6ea8" }}
                />
                Вы ({myTicket?.customName || "Ваш билет"})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block bg-[#b5651d]" />
                Второй читатель ({opponent?.customName || "Собеседник"})
              </span>
            </div>
          </div>

          {/* РАСКРЫТИЕ КАРТ: КНИГИ ВТОРОГО ЧИТАТЕЛЯ */}
          {opponent && (
            <div className="p-4 sm:p-5 rounded-xl border text-left mb-6 bg-black/15 border-current/15 space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-90">
                <Unlock size={14} className={isDark ? "text-[#d4af37]" : "text-[#3b6ea8]"} />
                Раскрытые книги второго читателя ({opponent.customName || "Собеседник"}):
              </span>
              <div className="flex flex-wrap gap-2">
                {opponent.favoriteBooks.map((b, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white/5 border-current/15 flex items-center gap-1.5"
                  >
                    <BookOpen size={13} className="opacity-70" />
                    {b.title}
                  </span>
                ))}
              </div>

              {opponent.kryptoniteBook && (
                <div className="pt-2 border-t border-current/10 flex items-center gap-2 text-xs">
                  <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                  <span className="opacity-75">
                    {activeCelebritySlug
                      ? "Криптонит (последняя книга тир-листа):"
                      : "Криптонит второго читателя:"}
                  </span>
                  <span className="font-bold line-through text-rose-300">
                    {opponent.kryptoniteBook.title}
                  </span>
                </div>
              )}

              {activeCelebritySlug && (
                <div className="pt-2 border-t border-current/10 flex justify-end">
                  <a
                    href={`/celebrities/${activeCelebritySlug}`}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${
                      isDark ? "text-[#f3d999]" : "text-[#3b6ea8]"
                    }`}
                  >
                    <span>Открыть полку знаменитости</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* КНОПКИ ЭКСПОРТА ВИЗУАЛЬНОЙ КАРТОЧКИ ДУЭЛИ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 mb-3">
            <button
              type="button"
              onClick={() => handleDownloadDuel("card")}
              disabled={downloadingFormat !== null}
              className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md cursor-pointer transition-all disabled:opacity-65 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                  : "bg-[#b3412f] hover:bg-[#c94935]"
              }`}
            >
              {downloadingFormat === "card" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Готовим PNG...
                </>
              ) : (
                <>
                  <Download size={15} />
                  Скачать карточку (PNG)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownloadDuel("stories")}
              disabled={downloadingFormat !== null}
              className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors disabled:opacity-65 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-[#24170f] border-[rgba(201,163,91,0.45)] hover:bg-[#c9a35b]/15 text-[#efe3cc]"
                  : "bg-white border-[rgba(59,110,168,0.45)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
              }`}
            >
              {downloadingFormat === "stories" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Готовим 9:16...
                </>
              ) : (
                <>
                  <Smartphone size={15} />
                  Для Stories (9:16)
                </>
              )}
            </button>
          </div>

          {/* КНОПКИ ШЕРИНГА И СБРОСА */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyResult}
              className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                copiedResult
                  ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
                  : isDark
                    ? "border-[rgba(201,163,91,0.4)] hover:bg-[#c9a35b]/10 text-[#efe3cc]"
                    : "border-[rgba(59,110,168,0.4)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
              }`}
            >
              {copiedResult ? (
                <>
                  <Check size={16} />
                  Скопировано для чата!
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  Поделиться в чате
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetDuel}
              className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                isDark
                  ? "border-[rgba(201,163,91,0.4)] hover:bg-[#c9a35b]/10 text-[#efe3cc]"
                  : "border-[rgba(59,110,168,0.4)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
              }`}
            >
              <RotateCcw size={15} />
              Сравнить с другим билетом
            </button>
          </div>
        </motion.div>

        {/* Скрытые контейнеры для экспорта PNG (600×760 ×2) и Stories 9:16 (540×960 ×2) */}
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
          <div ref={duelCardRef}>
            <DuelExportCard
              format="card"
              myTicket={myTicket}
              opponent={opponent}
              opponentTicketNumber={opponentTicketNumber}
              duelResult={duelResult}
              conflictBookTitle={conflictBookTitle}
              theme={theme}
            />
          </div>
          <div ref={duelStoryRef}>
            <DuelExportCard
              format="stories"
              myTicket={myTicket}
              opponent={opponent}
              opponentTicketNumber={opponentTicketNumber}
              duelResult={duelResult}
              conflictBookTitle={conflictBookTitle}
              theme={theme}
            />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. ЕСЛИ У ПОЛЬЗОВАТЕЛЯ ЕЩЁ НЕТ СВОЕГО БИЛЕТА
  // ═══════════════════════════════════════════════════════════════════════
  if (!myTicket) {
    // Входящий вызов от оппонента
    if (opponent || opponentTicketNumber) {
      return (
        <div className={`max-w-xl mx-auto ${className}`}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-6 sm:p-8 shadow-xl relative overflow-hidden transition-colors ${
              isDark
                ? "bg-[#2b1d14] border-[rgba(212,175,55,0.45)] text-[#efe3cc]"
                : "bg-[#fffdf7] border-[rgba(59,110,168,0.4)] text-[#2e2a24]"
            }`}
          >
            <div className="flex items-center gap-2 text-amber-500 mb-3">
              <Swords size={22} />
              <span className="text-xs font-mono uppercase tracking-[0.2em] font-bold">
                ПРИГЛАШЕНИЕ К СРАВНЕНИЮ ВКУСОВ
              </span>
            </div>

            <h2
              className={`text-2xl sm:text-3xl font-bold mb-2 ${
                isDark
                  ? "font-serif text-[#efe3cc]"
                  : "font-['Caveat',cursive] text-3xl sm:text-4xl text-[#2e2a24]"
              }`}
            >
              {opponent?.customName || "Читатель"} предлагает сравнить вкусы!
            </h2>

            <p className="text-xs sm:text-sm opacity-80 leading-relaxed mb-6">
              Узнайте, насколько совпадают ваши книжные ориентиры и читательские привычки.
              Приглашение отправлено по билету <b>#{opponent?.ticketNumber || opponentTicketNumber}</b>.
            </p>

            {/* Карточка второго читателя под замком */}
            <div className="p-4 rounded-xl border bg-black/15 border-current/15 mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block">
                    АРХЕТИП ЧИТАТЕЛЯ
                  </span>
                  <span className="font-serif font-bold text-base">
                    {opponent?.archetypeName || "Хранитель фолиантов"}
                  </span>
                </div>
                <span className="font-mono text-xs opacity-75 border px-2 py-0.5 rounded-sm">
                  #{opponent?.ticketNumber || opponentTicketNumber}
                </span>
              </div>

              <div className="pt-2 border-t border-current/10 flex items-center gap-2 text-xs opacity-75">
                <Lock size={14} className="text-amber-400 shrink-0" />
                <span>3 Священные книги и Криптонит скрыты до сравнения вкусов</span>
              </div>
            </div>

            {/* Кнопка пройти тест */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={onGoToTest}
                className={`w-full py-3.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isDark
                    ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                    : "bg-[#b3412f] hover:bg-[#c94935]"
                }`}
              >
                <Sparkles size={16} />
                Сравнить вкусы (пройти тест за 60 секунд)
                <ArrowRight size={16} />
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-current/15"></div>
                <span className="shrink mx-3 text-[10px] font-mono uppercase tracking-widest opacity-50">
                  ИЛИ
                </span>
                <div className="grow border-t border-current/15"></div>
              </div>

              {/* Ввести свой номер билета, если уже есть */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold opacity-80">
                  Уже есть свой читательский билет?
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="grow flex items-center rounded-lg border bg-black/10 border-current/20 focus-within:ring-1 focus-within:ring-current overflow-hidden">
                    <span className="pl-3 pr-0 font-mono text-xs font-bold opacity-60 select-none">
                      BS-
                    </span>
                    <input
                      type="text"
                      placeholder="7492-X"
                      value={inputTicketSuffix}
                      onChange={handleTicketSuffixChange}
                      className="grow py-2.5 pl-0 pr-2 text-xs font-mono uppercase bg-transparent border-0 focus:outline-none placeholder:opacity-40"
                    />
                    {inputTicketSuffix && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputTicketSuffix("");
                          setErrorMsg(null);
                        }}
                        className="pr-2.5 text-xs opacity-50 hover:opacity-100 transition-opacity cursor-pointer select-none"
                        title="Очистить"
                        aria-label="Очистить поле"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleExistingTicketDuel}
                    disabled={isLoading || !isCompleteTicketSuffix(inputTicketSuffix)}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer disabled:opacity-40 shrink-0 inline-flex items-center justify-center ${
                      isDark
                        ? "border-[rgba(201,163,91,0.5)] hover:bg-[#c9a35b]/10 text-[#efe3cc]"
                        : "border-[rgba(59,110,168,0.5)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
                    }`}
                  >
                    {isLoading ? "Сравнение..." : "Сравнить"}
                  </button>
                </div>
                {errorMsg && <p className="text-xs text-rose-400 pt-1">{errorMsg}</p>}
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    // Если зашёл сам без билета и без вызова
    return (
      <div className={`max-w-xl mx-auto ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-6 sm:p-8 text-center shadow-xl relative overflow-hidden transition-colors ${
            isDark
              ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
              : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
          }`}
        >
          {/* Сургучная печать с замком */}
          <div className="inline-flex p-3 rounded-full mb-3 bg-black/10 text-amber-500">
            <Lock size={28} />
          </div>

          <h2
            className={`text-xl sm:text-2xl font-bold mb-2 ${
              isDark
                ? "font-serif text-[#efe3cc]"
                : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
            }`}
          >
            Вход только по Читательскому билету
          </h2>

          <p className="text-xs sm:text-sm opacity-75 max-w-md mx-auto mb-6 leading-relaxed">
            Чтобы сравнивать вкусы в книжных чатах или находить книжных соулмейтов среди друзей,
            сначала сформируйте и запечатайте свой Читательский ДНК.
          </p>

          {/* 3 понятных шага */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
            <div className="p-3.5 rounded-xl border bg-black/10 border-current/10 space-y-1">
              <span className="font-mono text-xs font-bold text-amber-500 block">01 · Анкета</span>
              <span className="text-xs font-semibold block">6 осей и книги</span>
              <p className="text-[11px] opacity-70 leading-snug">
                Определите ваши литературные ориентиры и криптонит.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border bg-black/10 border-current/10 space-y-1">
              <span className="font-mono text-xs font-bold text-amber-500 block">02 · Печать</span>
              <span className="text-xs font-semibold block">Запечатывание</span>
              <p className="text-[11px] opacity-70 leading-snug">
                Получите персональный номер билета и сургучную печать.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border bg-black/10 border-current/10 space-y-1">
              <span className="font-mono text-xs font-bold text-amber-500 block">03 · Сравнение</span>
              <span className="text-xs font-semibold block">Сравнение в чате</span>
              <p className="text-[11px] opacity-70 leading-snug">
                Отправьте ссылку друзьям и проверьте резонанс вкусов.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToTest}
            className={`py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md inline-flex items-center gap-2 cursor-pointer transition-all ${
              isDark
                ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                : "bg-[#b3412f] hover:bg-[#c94935]"
            }`}
          >
            <Sparkles size={16} />
            Пройти тест и получить билет
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. У ПОЛЬЗОВАТЕЛЯ ЕСТЬ БИЛЕТ — ХАБ ДУЭЛЕЙ ДЛЯ ВЛАДЕЛЬЦА
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className={`space-y-6 max-w-3xl mx-auto ${className}`}>
      {/* 3.1. БЛОК: БРОСИТЬ ВЫЗОВ В ЧАТ */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 shadow-lg transition-colors ${
          isDark
            ? "bg-[#2b1d14] border-[rgba(212,175,55,0.45)] text-[#efe3cc]"
            : "bg-[#fffdf7] border-[rgba(59,110,168,0.4)] text-[#2e2a24]"
        }`}
      >
        <div className="flex items-center gap-2 text-amber-500 mb-2">
          <Swords size={20} />
          <span className="text-xs font-mono uppercase tracking-[0.2em] font-bold">
            СРАВНЕНИЕ ВКУСОВ С ДРУЗЬЯМИ
          </span>
        </div>

        <h3
          className={`text-xl sm:text-2xl font-bold mb-2 ${
            isDark
              ? "font-serif text-[#efe3cc]"
              : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
          }`}
        >
          Проверьте книжный резонанс с друзьями
        </h3>

        <p className="text-xs sm:text-sm opacity-80 leading-relaxed mb-4 max-w-lg">
          Отправьте ссылку для сравнения в книжный чат или другу. Когда он пройдёт тест, система
          рассчитает совместимость ваших вкусов и покажет взаимный резонанс!
        </p>

        {/* Карточка персонального номера билета */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl border bg-black/10 border-current/15 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-75 font-mono">Ваш персональный номер:</span>
            <span
              className={`font-mono text-xs sm:text-sm font-bold tracking-wider px-2 py-0.5 rounded border ${
                isDark
                  ? "bg-[#35261b] border-[rgba(212,175,55,0.4)] text-[#f4d03f]"
                  : "bg-white border-[rgba(59,110,168,0.4)] text-[#3b6ea8]"
              }`}
            >
              {myTicket.ticketNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyMyTicketNumber}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 cursor-pointer transition-all ${
              copiedMyNumber
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                : isDark
                  ? "border-[rgba(201,163,91,0.4)] hover:bg-[#c9a35b]/10 text-[#efe3cc]"
                  : "border-[rgba(59,110,168,0.4)] hover:bg-[#3b6ea8]/10 text-[#2e2a24]"
            }`}
          >
            {copiedMyNumber ? (
              <>
                <Check size={13} className="text-emerald-400" />
                Номер скопирован!
              </>
            ) : (
              <>
                <Copy size={13} />
                Скопировать номер билета
              </>
            )}
          </button>
        </div>

        {/* Поле со ссылкой и кнопка скопировать */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="grow px-3.5 py-2.5 rounded-xl border bg-black/10 border-current/20 font-mono text-xs truncate flex items-center opacity-85 select-all">
            {`${window.location.origin}/reading-dna?challenge=${myTicket.ticketNumber}`}
          </div>
          <button
            type="button"
            onClick={handleCopyChallenge}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all ${
              copiedChallenge
                ? "bg-emerald-600 hover:bg-emerald-500"
                : isDark
                  ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                  : "bg-[#b3412f] hover:bg-[#c94935]"
            }`}
          >
            {copiedChallenge ? (
              <>
                <Check size={16} />
                Скопировано!
              </>
            ) : (
              <>
                <Copy size={16} />
                Скопировать ссылку для сравнения
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3.2. БЛОК: СРАВНИТЬ ПО КОДУ БИЛЕТА ДРУГА */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 shadow-lg transition-colors ${
          isDark
            ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
            : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
        }`}
      >
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <ShieldCheck size={18} className={isDark ? "text-[#d4af37]" : "text-[#3b6ea8]"} />
          <span className="text-xs font-mono uppercase tracking-[0.18em] font-semibold">
            СРАВНЕНИЕ ПО НОМЕРУ БИЛЕТА
          </span>
        </div>

        <h4
          className={`text-lg sm:text-xl font-bold mb-1.5 ${
            isDark
              ? "font-serif text-[#efe3cc]"
              : "font-['Caveat',cursive] text-xl sm:text-2xl text-[#2e2a24]"
          }`}
        >
          У вас есть номер билета друга?
        </h4>

        <p className="text-xs opacity-75 mb-4 leading-relaxed">
          Введите персональный шифр билета (например, <b>BS-7492-A</b>), чтобы мгновенно сравнить читательские вкусы.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
          <div className="grow flex items-center rounded-xl border bg-black/10 border-current/20 focus-within:ring-1 focus-within:ring-current overflow-hidden">
            <span className="pl-3.5 pr-0 font-mono text-xs font-bold opacity-60 select-none">
              BS-
            </span>
            <input
              type="text"
              placeholder="7492-A"
              value={inputTicketSuffix}
              onChange={handleTicketSuffixChange}
              className="grow py-2.5 pl-0 pr-2 text-xs font-mono uppercase bg-transparent border-0 focus:outline-none placeholder:opacity-40"
            />
            {inputTicketSuffix && (
              <button
                type="button"
                onClick={() => {
                  setInputTicketSuffix("");
                  setErrorMsg(null);
                }}
                className="pr-3 text-xs opacity-50 hover:opacity-100 transition-opacity cursor-pointer select-none"
                title="Очистить"
                aria-label="Очистить поле"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleRunDuelWithTarget(inputTicketSuffix)}
            disabled={isLoading || !isCompleteTicketSuffix(inputTicketSuffix)}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md cursor-pointer disabled:opacity-40 transition-all shrink-0 inline-flex items-center justify-center ${
              isDark
                ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                : "bg-[#b3412f] hover:bg-[#c94935]"
            }`}
          >
            {isLoading ? "Сравнение..." : "Сравнить вкусы"}
          </button>
        </div>

        {errorMsg && <p className="text-xs text-rose-400 pt-2">{errorMsg}</p>}
      </div>

      {/* 3.3. БЛОК: ДУЭЛЬ СО ЗНАМЕНИТОСТЬЮ В 1 КЛИК */}
      {celebrities.length > 0 && (
        <div
          className={`rounded-2xl border p-6 sm:p-8 shadow-lg transition-colors ${
            isDark
              ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
              : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)] text-[#2e2a24]"
          }`}
        >
          <div className="flex items-center gap-2 mb-2 text-amber-500">
            <Star size={18} />
            <span className="text-xs font-mono uppercase tracking-[0.18em] font-bold">
              ДУЭЛЬ СО ЗНАМЕНИТОСТЬЮ В 1 КЛИК
            </span>
          </div>

          <h4
            className={`text-lg sm:text-xl font-bold mb-1.5 ${
              isDark
                ? "font-serif text-[#efe3cc]"
                : "font-['Caveat',cursive] text-xl sm:text-2xl text-[#2e2a24]"
            }`}
          >
            Сравните вкус с полками знаменитостей BookStrata
          </h4>

          <p className="text-xs opacity-75 mb-4 leading-relaxed">
            ДНК знаменитости вычислен по книгам её тир-листа, а криптонитом выступает последняя книга списка.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {celebrities.map((celeb) => {
              const isBusy = loadingCelebritySlug === celeb.slug;
              return (
                <button
                  key={celeb.id}
                  type="button"
                  disabled={Boolean(loadingCelebritySlug)}
                  onClick={() => handleRunCelebrityDuel(celeb)}
                  className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                    isDark
                      ? "bg-[#1e130c]/70 border-[rgba(201,163,91,0.25)] hover:border-[rgba(201,163,91,0.6)]"
                      : "bg-[#fbf8f2] border-[rgba(59,110,168,0.25)] hover:border-[rgba(59,110,168,0.6)]"
                  }`}
                >
                  {celeb.photoUrl ? (
                    <img
                      src={celeb.photoUrl}
                      alt={celeb.name}
                      loading="lazy"
                      style={{ objectPosition: `${celeb.focalX}% ${celeb.focalY}%` }}
                      className="w-11 h-11 rounded-full object-cover border border-current/20 shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border shrink-0 ${
                        isDark
                          ? "bg-[#35261b] border-[rgba(201,163,91,0.35)] text-[#f3d999]"
                          : "bg-white border-[rgba(59,110,168,0.3)] text-[#3b6ea8]"
                      }`}
                    >
                      {celeb.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate group-hover:underline">
                      {celeb.name}
                    </div>
                    <div className="text-[11px] opacity-70 truncate">
                      {celeb.archetypeName} · {celeb.booksCount} книг
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                      isDark
                        ? "bg-[#8a2433] text-white group-hover:bg-[#a32b3d]"
                        : "bg-[#b3412f] text-white group-hover:bg-[#c94935]"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Swords size={12} />
                    )}
                    <span>Дуэль</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
