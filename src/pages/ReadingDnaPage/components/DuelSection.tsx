import { useState, useMemo, useCallback } from "react";
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
  ShieldCheck,
  BookOpen,
  X,
} from "lucide-react";
import type {
  ReadingDnaResponseData,
  ReadingDnaDuelResultData,
} from "@/lib/readingDnaApi";
import { conductReadingDuel, getReadingTicket } from "@/lib/readingDnaApi";

export interface DuelSectionProps {
  myTicket: ReadingDnaResponseData | null;
  opponentTicket?: ReadingDnaResponseData | null;
  opponentTicketNumber?: string | null;
  initialDuelResult?: ReadingDnaDuelResultData | null;
  theme?: "dark" | "craft" | "light";
  onGoToTest: () => void;
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

  // Копирование результата сравнения
  const handleCopyResult = useCallback(() => {
    if (!duelResult) return;
    const shareUrl = window.location.href;
    const textToShare = `Сравнение читательских вкусов на BookStrata: совместимость ${duelResult.compatibility}%! ${duelResult.verdict}\n${shareUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToShare);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2500);
    }
  }, [duelResult]);

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

  // СБРОС ДУЭЛИ
  const handleResetDuel = useCallback(() => {
    setDuelResult(null);
    setInputTicketSuffix("");
    setErrorMsg(null);
  }, []);

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

          <p className="text-xs sm:text-sm opacity-75 max-w-md mx-auto mb-6">
            Сравнение вкусов между билетом <b>#{myTicket?.ticketNumber || "Вы"}</b> и{" "}
            <b>#{opponent?.ticketNumber || opponentTicketNumber || "Собеседник"}</b>
          </p>

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
                  <span className="opacity-75">Криптонит второго читателя:</span>
                  <span className="font-bold line-through text-rose-300">
                    {opponent.kryptoniteBook.title}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* КНОПКИ ДЕЙСТВИЙ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyResult}
              className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md cursor-pointer transition-all ${
                copiedResult
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : isDark
                    ? "bg-[#8a2433] hover:bg-[#a32b3d]"
                    : "bg-[#b3412f] hover:bg-[#c94935]"
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
    </div>
  );
}
