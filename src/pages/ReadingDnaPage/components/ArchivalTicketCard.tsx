import { useMemo, useState, useCallback } from "react";
import type { DnaAxesData, DnaBookItemData } from "@/lib/readingDnaApi";
import { ReadingTicketQr } from "./ReadingTicketQr";
import { useDnaArchetypes } from "../hooks/useDnaArchetypes";
import {
  findArchetypeByIdOrName,
  formatQuote,
  resolveArchetypeByRanges,
} from "../domain/dnaArchetypeMatch";
import { getCasteSealUrl } from "../utils/casteSeals";

export interface ArchivalTicketCardProps {
  ticketNumber?: string;
  customName?: string | null;
  archetypeName?: string;
  rarityPercent?: number | null;
  axes: DnaAxesData;
  favoriteBooks?: (DnaBookItemData | null)[];
  kryptoniteBook?: DnaBookItemData | null;
  theme?: "dark" | "craft" | "light";
  isSealed?: boolean;
  sealImageUrl?: string;
  className?: string;
}

// 6 осей в соответствии с эталонным макетом
const AXIS_NAMES = [
  "Рефлексия",
  "Тяжесть",
  "Погружение",
  "Мрачность",
  "Эпика",
  "Глубина",
];

const BOOK_SPINE_COLORS = [
  "from-[#3b6ea8] to-[#1e3a5f]", // Синий томик
  "from-[#4a3525] to-[#2b1d14]", // Темно-коричневый томик
  "from-[#c9892f] to-[#8a5717]", // Золотисто-коричневый томик
];

export function ArchivalTicketCard({
  ticketNumber = "BS-.....",
  customName = null,
  archetypeName = "",
  rarityPercent = null,
  axes,
  favoriteBooks = [],
  kryptoniteBook = null,
  theme = "dark",
  isSealed = false,
  sealImageUrl,
  className = "",
}: ArchivalTicketCardProps) {
  const isDark = theme === "dark";
  const [sealImgFailed, setSealImgFailed] = useState(false);
  const { archetypes } = useDnaArchetypes();

  const hasActiveAxes = useMemo(
    () => Object.values(axes).some((v) => (v ?? 0) > 0),
    [axes]
  );

  // Определение архетипа по названию или по осям читательского вкуса
  const resolvedArchetype = useMemo(() => {
    if (archetypeName) {
      const found = findArchetypeByIdOrName(archetypes, archetypeName);
      if (found) return found;
    }
    if (hasActiveAxes || isSealed) {
      return resolveArchetypeByRanges(archetypes, axes);
    }
    return undefined;
  }, [archetypeName, axes, hasActiveAxes, isSealed, archetypes]);

  // Печать ордена: если передан специфический URL — используем его,
  // иначе автоматически подтягиваем печать соответствующего Ордена
  const effectiveSealImageUrl = useMemo(
    () => sealImageUrl || getCasteSealUrl(resolvedArchetype?.caste?.id),
    [sealImageUrl, resolvedArchetype?.caste?.id]
  );

  // Расчет точек для радара вкуса (SVG polygon на сетке 220x220)
  const size = 220;
  const cx = 110;
  const cy = 110;
  const radius = 72;

  const axisValues = useMemo(
    () => [
      axes.storyFocus ?? 0,
      axes.emotionalWeight ?? 0,
      axes.pace ?? 0,
      axes.darkness ?? 0,
      axes.scope ?? 0,
      axes.complexity ?? 0,
    ],
    [axes]
  );

  const radarPoints = useMemo(() => {
    return axisValues
      .map((val, idx) => {
        const angle = ((-90 + idx * 60) * Math.PI) / 180;
        const r = (Math.min(100, Math.max(0, val)) / 100) * (radius - 2);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [axisValues, cx, cy, radius]);

  const qrValue = `https://bookstrata.ru/reading-dna/duel?ticket=${ticketNumber || "BS-04821"}`;

  const dnaFormula = `${axes.storyFocus ?? 0}—${axes.emotionalWeight ?? 0}—${axes.pace ?? 0}—${axes.darkness ?? 0}—${axes.scope ?? 0}—${axes.complexity ?? 0}`;

  // Интерактивный 3D-наклон карточки и световой блик
  const [tilt, setTilt] = useState({
    x: 0,
    y: 0,
    glareX: 50,
    glareY: 50,
    active: false,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Ограничиваем координаты границами [0, 1] для предотвращения скачков на кромке
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // Плавный угол наклона в пределах 10-12 градусов
    const rotY = (px - 0.5) * 14;
    const rotX = (0.5 - py) * 12;

    setTilt({
      x: rotX,
      y: rotY,
      glareX: Math.round(px * 100),
      glareY: Math.round(py * 100),
      active: true,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });
  }, []);

  // Динамическая многослойная тень, смещающаяся против движения карточки
  const dynamicShadow = useMemo(() => {
    if (!tilt.active) {
      return isDark
        ? "0 22px 48px -12px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(212, 175, 55, 0.35), inset 0 1px 2px rgba(255, 235, 150, 0.25)"
        : "0 18px 36px -12px rgba(46, 42, 36, 0.25), inset 0 0 0 1px rgba(59, 110, 168, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.8)";
    }
    const sx = -tilt.y * 1.5;
    const sy = tilt.x * 1.5 + 24;
    return isDark
      ? `${sx.toFixed(1)}px ${sy.toFixed(1)}px 48px -8px rgba(0, 0, 0, 0.85), 0 4px 16px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255, 225, 140, 0.5), inset 0 2px 4px rgba(255, 235, 150, 0.4)`
      : `${sx.toFixed(1)}px ${sy.toFixed(1)}px 36px -8px rgba(46, 42, 36, 0.35), 0 4px 12px rgba(0,0,0,0.15), inset 0 0 0 1.5px rgba(59, 110, 168, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.9)`;
  }, [tilt, isDark]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        containerType: "inline-size",
        perspective: "1400px",
      }}
      className={`relative w-full ${className}`}
    >
      <div
        style={{
          containerType: "inline-size",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: tilt.active
            ? "transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)"
            : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease-out",
          boxShadow: dynamicShadow,
        }}
        className={`relative w-full aspect-[1200/570] rounded-[1.2cqw] border overflow-hidden select-none transition-colors will-change-transform ${
          isDark
            ? "bg-[#2b1d14] border-[rgba(212,175,55,0.45)] text-[#efe3cc]"
            : "bg-[#fffdf7] border-[rgba(59,110,168,0.45)] text-[#2e2a24]"
        }`}
      >
        {/* Текстура натуральной кожи книжного переплета — точно как на 3D книге */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity"
          style={{
            backgroundImage: `url("/textures/leather.webp")`,
            backgroundSize: "360px 360px",
            backgroundRepeat: "repeat",
            backgroundColor: isDark ? "#3d2817" : "#dfd3c3",
            opacity: isDark ? 0.95 : 0.35,
          }}
        />

        {/* Мягкий объёмный свет на коже (в точности как на 3D книге) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(ellipse at 35% 25%, rgba(255, 235, 170, 0.22) 0%, rgba(0,0,0,0.3) 70%)"
              : "radial-gradient(ellipse at 35% 25%, rgba(255, 255, 255, 0.5) 0%, transparent 70%)",
          }}
        />

        {/* Глубокая кожаная виньетка переплета по периметру */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none ${
            isDark
              ? "shadow-[inset_0_0_60px_rgba(0,0,0,0.75),inset_0_0_20px_rgba(0,0,0,0.6)]"
              : "shadow-[inset_0_0_40px_rgba(46,42,36,0.18)]"
          }`}
        />

        {/* Микротекстура волокон картона */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Световой блик позолоты, следующий за положением курсора */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-200"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: isDark
              ? `radial-gradient(circle 420px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 235, 170, 0.26) 0%, rgba(212, 175, 55, 0.12) 35%, transparent 70%)`
              : `radial-gradient(circle 420px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(210, 225, 255, 0.12) 35%, transparent 70%)`,
            mixBlendMode: isDark ? "screen" : "soft-light",
          }}
        />

        {/* ЛЕВЫЙ ВЕРХНИЙ БЛОК: Заголовок Ордена на месте, титул со слоганом опущены ниже */}
        <div className="absolute left-[3.6cqw] top-[3.2cqw] w-[44cqw] z-10 flex flex-col justify-start">
          <span
            className={`block uppercase font-sans font-semibold leading-none ${
              isDark ? "" : "text-[#3b6ea8]"
            }`}
            style={{
              fontSize: "0.85cqw",
              letterSpacing: "0.2em",
              transform: "translateZ(8px)",
              ...(isDark
                ? {
                    background: "linear-gradient(135deg, #f4d03f 0%, #d4af37 50%, #c9a227 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 4px rgba(212, 175, 55, 0.35))",
                  }
                : {
                    color: "#3b6ea8",
                    textShadow: "0 1px 0 rgba(255, 255, 255, 0.8)",
                  }),
            }}
          >
            {resolvedArchetype
              ? `BOOKSTRATA · ${resolvedArchetype.caste.name.toUpperCase()} · СЕРИЯ «ДНК»`
              : "Тайное общество читателей — BookStrata"}
          </span>

          {customName?.trim() && (
            <div
              className={`font-serif font-semibold truncate mt-[1.8cqw] leading-tight ${
                isDark ? "text-[#f3d999]" : "text-[#3b6ea8]"
              }`}
              style={{
                fontSize: "1.5cqw",
                maxWidth: "42cqw",
                transform: "translateZ(10px)",
              }}
              title={customName.trim()}
            >
              {customName.trim()}
            </div>
          )}

          <h2
            className={`font-['Caveat',cursive] font-bold tracking-tight leading-[1.05] ${
              customName?.trim() ? "mt-[0.7cqw]" : "mt-[4.2cqw]"
            } ${
              isDark
                ? "text-[#fff2d6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                : "text-[#2e2a24] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]"
            }`}
            style={{
              fontSize: "3.8cqw",
              transform: "translateZ(12px)",
              textShadow: isDark
                ? "0 1px 2px rgba(0,0,0,0.9), 0 -1px 0 rgba(212,175,55,0.25)"
                : "0 1px 0 rgba(255,255,255,0.9), 0 -1px 0 rgba(0,0,0,0.2)",
            }}
          >
            {isSealed || resolvedArchetype ? (
              archetypeName || (isDark ? resolvedArchetype?.names.dark : resolvedArchetype?.names.craft)
            ) : (
              <>
                Титул определится
                <br />
                после теста
              </>
            )}
          </h2>

          {/* Слоган-девиз читательского архетипа */}
          {(isSealed || resolvedArchetype) && resolvedArchetype?.quote && (
            <p
              className={`font-serif italic tracking-wide leading-tight mt-[0.6cqw] line-clamp-2 ${
                isDark ? "text-[#efe3cc]/90" : "text-[#2e2a24]/90"
              }`}
              style={{ fontSize: "1.4cqw", maxWidth: "44cqw", transform: "translateZ(10px)" }}
            >
              {formatQuote(resolvedArchetype.quote)}
            </p>
          )}
        </div>

        {/* СВЕРХУ ПО ЦЕНТРУ: Номер билета с эффектом золотого тиснения */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-[3.2cqw] z-20 font-['Caveat',cursive] italic font-bold leading-none select-none text-center ${
            isDark ? "text-[#f3d999]" : "text-[#3b6ea8]"
          }`}
          style={{
            fontSize: "2.8cqw",
            transform: "translateZ(16px)",
            textShadow: isDark
              ? "0 1px 0 rgba(255,235,160,0.4), 0 -1px 0 rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)"
              : "0 1px 0 rgba(255,255,255,0.9), 0 -1px 0 rgba(0,0,0,0.2)",
          }}
        >
          {isSealed ? ticketNumber : "BS-....."}
        </div>

      {/* БЕЙДЖИ: Номер архетипа и редкость — чуть правее над шкалой */}
      {resolvedArchetype && (
        <div
          className="absolute right-[15cqw] top-[3.2cqw] z-20 flex items-center justify-center gap-[0.4cqw] select-none"
          style={{ fontSize: "0.75cqw", transform: "translateZ(14px)" }}
        >
          <span
            className={`font-mono font-bold uppercase tracking-wider px-[0.45cqw] py-[0.15cqw] rounded-[0.25cqw] border shadow-xs ${
              isDark
                ? "bg-[#35261b]/90 border-[rgba(212,175,55,0.45)] text-[#f0d494]"
                : "bg-white/90 border-[rgba(59,110,168,0.4)] text-[#3b6ea8]"
            }`}
          >
            АРХЕТИП №{resolvedArchetype.number}/16
          </span>
          <span
            className={`font-mono font-bold uppercase tracking-wider px-[0.45cqw] py-[0.15cqw] rounded-[0.25cqw] border shadow-xs ${
              isDark
                ? "bg-[#8a2433]/40 border-rose-500/40 text-rose-300"
                : "bg-[#b3412f]/10 border-rose-500/30 text-[#b3412f]"
            }`}
          >
            РЕДКОСТЬ {rarityPercent !== null && rarityPercent !== undefined ? (Number.isInteger(rarityPercent) ? rarityPercent : rarityPercent.toFixed(1)) : resolvedArchetype.rarity}%
          </span>
        </div>
      )}

      {/* ПРАВЫЙ ВЕРХНИЙ УГОЛ: Сургучная печать Ордена */}
      <div
        className="absolute right-[3.6cqw] top-[3.2cqw] z-20 flex items-center justify-center select-none"
        style={{ transform: "translateZ(26px)" }}
      >
        {isSealed ? (
          effectiveSealImageUrl && !sealImgFailed ? (
            <div
              style={{ width: "10.5cqw", height: "10.5cqw" }}
              className="flex items-center justify-center relative select-none"
            >
              <img
                src={effectiveSealImageUrl}
                alt="Печать"
                width={68}
                height={68}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain drop-shadow-md rotate-3 hover:rotate-0 transition-transform pointer-events-none"
                onError={() => setSealImgFailed(true)}
              />
            </div>
          ) : (
            <div
              className="rounded-full flex items-center justify-center text-center p-[0.6cqw] font-bold uppercase tracking-wider text-white shadow-lg select-none"
              style={{
                width: "10.5cqw",
                height: "10.5cqw",
                fontSize: "1.7cqw",
                background: resolvedArchetype
                  ? `radial-gradient(circle at 35% 30%, #ffd166, ${resolvedArchetype.caste.sealColor} 70%)`
                  : isDark
                    ? "radial-gradient(circle at 35% 30%, #b5651d, #8a2433 70%)"
                    : "radial-gradient(circle at 35% 30%, #c9892f, #b3412f 70%)",
              }}
            >
              ИММУНИТЕТ
            </div>
          )
        ) : (
          <div
            className={`rounded-full border border-dashed flex items-center justify-center text-center p-[0.6cqw] font-['Caveat',cursive] uppercase tracking-wider select-none ${
              isDark
                ? "border-[rgba(201,163,91,0.45)] text-[#a89678]"
                : "border-[rgba(59,110,168,0.45)] text-[#6f6553]"
            }`}
            style={{ width: "10.5cqw", height: "10.5cqw", fontSize: "2.3cqw" }}
          >
            печать
          </div>
        )}
      </div>

      {/* ЛЕВЫЙ НИЖНИЙ БЛОК: Книжный ряд (4 книги опущены вниз с обозначениями сверху) */}
      <div className="absolute left-[3.6cqw] bottom-[8cqw] z-10 flex items-start gap-[1.6cqw]">
        {/* Группа: 3 священные книги */}
        <div className="flex flex-col items-center">
          <div
            className={`font-mono uppercase tracking-[0.18em] font-bold text-center mb-[0.5cqw] select-none ${
              isDark ? "text-[#c9a35b]" : "text-[#3b6ea8]"
            }`}
            style={{ fontSize: "0.75cqw" }}
          >
            ✦ Священные книги ✦
          </div>

          <div className="flex items-start gap-[1.2cqw]">
            {[0, 1, 2].map((idx) => {
              const book = favoriteBooks[idx];
              return (
                <div key={idx} className="flex flex-col items-center">
                  {book ? (
                    book.coverImageUrl ? (
                      <div
                        className="rounded-[0.5cqw] relative overflow-hidden shadow-md border border-amber-500/30"
                        style={{ width: "7.2cqw", height: "10.8cqw" }}
                      >
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      /* Шаблонная обложка томика */
                      <div
                        className={`rounded-[0.5cqw] relative overflow-hidden shadow-md flex flex-col justify-between p-[0.6cqw] text-center border transition-all ${
                          isDark
                            ? `bg-linear-to-b ${BOOK_SPINE_COLORS[idx % 3]} border-[rgba(201,163,91,0.35)] text-[#efe3cc]`
                            : `bg-linear-to-b ${BOOK_SPINE_COLORS[idx % 3]} border-[rgba(59,110,168,0.35)] text-white`
                        }`}
                        style={{ width: "7.2cqw", height: "10.8cqw" }}
                      >
                        {/* Корешок томика слева */}
                        <div className="absolute left-0 top-0 bottom-0 w-[0.5cqw] bg-black/30 pointer-events-none" />
                        {/* Тисненая внутренняя рамка */}
                        <div className="absolute inset-[0.4cqw] border border-amber-300/30 rounded-[0.2cqw] pointer-events-none" />
                        {/* Иконка тиснения сверху */}
                        <div
                          className="relative z-10 pt-[0.2cqw] leading-none opacity-70 font-mono select-none"
                          style={{ fontSize: "1.0cqw" }}
                        >
                          ✦
                        </div>
                        {/* Символ книги по центру */}
                        <div
                          className="relative z-10 my-auto leading-none opacity-90 drop-shadow-sm select-none"
                          style={{ fontSize: "2.4cqw" }}
                        >
                          📖
                        </div>
                        {/* Декоративное тиснение снизу */}
                        <div
                          className="relative z-10 pb-[0.2cqw] leading-none opacity-70 font-mono select-none"
                          style={{ fontSize: "1.0cqw" }}
                        >
                          ✦
                        </div>
                      </div>
                    )
                  ) : (
                    /* Пустой слот со скриншота */
                    <div
                      className={`rounded-[0.5cqw] border border-dashed flex flex-col justify-center items-center p-[0.6cqw] text-center shadow-xs transition-all ${
                        isDark
                          ? "border-[rgba(201,163,91,0.4)] bg-[#24170f]/40 text-[#a89678]/80"
                          : "border-[rgba(59,110,168,0.4)] bg-white/70 text-[#6f6553]/80"
                      }`}
                      style={{ width: "7.2cqw", height: "10.8cqw" }}
                    >
                      <span
                        className="font-['Caveat',cursive] select-none"
                        style={{ fontSize: "1.9cqw" }}
                      >
                        книга
                      </span>
                    </div>
                  )}
                  {book ? (
                    <div
                      className="flex flex-col items-center mt-[0.5cqw]"
                      style={{ width: "7.2cqw" }}
                    >
                      <div
                        className={`line-clamp-2 w-full break-words hyphens-auto font-serif font-bold text-center leading-[1.15] drop-shadow-xs ${
                          isDark ? "text-[#efe3cc]" : "text-[#2e2a24]"
                        }`}
                        style={{ fontSize: "1.15cqw" }}
                        title={book.title}
                      >
                        {book.title}
                      </div>
                      {book.author && (
                        <div
                          className={`truncate text-center mt-[0.2cqw] opacity-70 ${
                            isDark ? "text-[#a89678]" : "text-[#6f6553]"
                          }`}
                          style={{ width: "7.2cqw", fontSize: "0.95cqw", lineHeight: "1" }}
                          title={book.author}
                        >
                          {book.author}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Группа: 4-я книга — Криптонит с бейджиком поверх обложки */}
        <div className="flex flex-col items-center">
          {/* Спейсер для выравнивания верхнего края с шапкой «Священные книги» */}
          <div
            className="font-mono uppercase tracking-[0.18em] font-bold text-center mb-[0.5cqw] select-none opacity-0 pointer-events-none"
            style={{ fontSize: "0.75cqw" }}
            aria-hidden="true"
          >
            &nbsp;
          </div>

          <div className="flex flex-col items-center relative">
            {/* Бейджик поверх обложки криптонита */}
            <div
              className="absolute -top-[0.8cqw] left-1/2 -translate-x-1/2 z-30 px-[0.6cqw] py-[0.15cqw] rounded-[0.25cqw] font-mono font-bold uppercase tracking-wider shadow-md select-none border whitespace-nowrap rotate-[-2deg]"
              style={{
                fontSize: "0.7cqw",
                backgroundColor: isDark ? "#8a2433" : "#b3412f",
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.35)",
              }}
            >
              ☠ КРИПТОНИТ
            </div>

            {kryptoniteBook ? (
              kryptoniteBook.coverImageUrl ? (
                <div
                  className="rounded-[0.5cqw] relative overflow-hidden shadow-md border border-rose-500/50"
                  style={{ width: "7.2cqw", height: "10.8cqw" }}
                >
                  <img
                    src={kryptoniteBook.coverImageUrl}
                    alt={kryptoniteBook.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                /* Шаблонная обложка криптонита */
                <div
                  className="rounded-[0.5cqw] relative overflow-hidden shadow-md flex flex-col justify-between p-[0.6cqw] text-center border border-rose-500/50 bg-linear-to-b from-[#8a2433] to-[#450a0a] text-rose-100"
                  style={{ width: "7.2cqw", height: "10.8cqw" }}
                >
                  {/* Корешок томика */}
                  <div className="absolute left-0 top-0 bottom-0 w-[0.5cqw] bg-black/40 pointer-events-none" />
                  {/* Тисненая рамка */}
                  <div className="absolute inset-[0.4cqw] border border-rose-300/30 rounded-[0.2cqw] pointer-events-none" />
                  {/* Символ сверху */}
                  <div
                    className="relative z-10 pt-[0.2cqw] leading-none opacity-70 font-mono text-rose-300 select-none"
                    style={{ fontSize: "1.0cqw" }}
                  >
                    ✦
                  </div>
                  {/* Череп криптонита по центру */}
                  <div
                    className="relative z-10 my-auto leading-none text-rose-300 drop-shadow-sm select-none"
                    style={{ fontSize: "2.4cqw" }}
                  >
                    ☠
                  </div>
                  {/* Символ снизу */}
                  <div
                    className="relative z-10 pb-[0.2cqw] leading-none opacity-70 font-mono text-rose-300 select-none"
                    style={{ fontSize: "1.0cqw" }}
                  >
                    ✦
                  </div>
                </div>
              )
            ) : (
              /* Пустой слот со скриншота */
              <div
                className="rounded-[0.5cqw] border border-dashed flex flex-col justify-center items-center p-[0.6cqw] text-center shadow-xs border-[#b3412f] bg-white/70 text-[#b3412f]"
                style={{ width: "7.2cqw", height: "10.8cqw" }}
              >
                <span
                  className="font-['Caveat',cursive] italic font-bold select-none opacity-80"
                  style={{ fontSize: "1.8cqw" }}
                >
                  криптонит
                </span>
              </div>
            )}
            {kryptoniteBook ? (
              <div
                className="flex flex-col items-center mt-[0.5cqw]"
                style={{ width: "7.2cqw" }}
              >
                <div
                  className={`line-clamp-2 w-full break-words hyphens-auto font-serif font-bold text-center leading-[1.15] drop-shadow-xs ${
                    isDark ? "text-rose-300" : "text-[#b3412f]"
                  }`}
                  style={{ fontSize: "1.15cqw" }}
                  title={kryptoniteBook.title}
                >
                  {kryptoniteBook.title}
                </div>
                {kryptoniteBook.author && (
                  <div
                    className={`truncate text-center mt-[0.2cqw] opacity-70 ${
                      isDark ? "text-rose-300/80" : "text-[#b3412f]/80"
                    }`}
                    style={{ width: "7.2cqw", fontSize: "0.95cqw", lineHeight: "1" }}
                    title={kryptoniteBook.author}
                  >
                    {kryptoniteBook.author}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ЦЕНТРАЛЬНО-ПРАВЫЙ БЛОК: Радар вкуса (аккуратная шкала строго под бейджами) */}
      <div
        className="absolute right-[18cqw] top-[9.5cqw] z-10 flex items-center justify-center"
        style={{ width: "26cqw", height: "26cqw" }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full overflow-visible select-none"
        >
          {/* Концентрическая паутинка из правильных шестиугольников */}
          {[0.33, 0.66, 1].map((scale, i) => {
            const gridPoints = [0, 1, 2, 3, 4, 5]
              .map((idx) => {
                const angle = ((-90 + idx * 60) * Math.PI) / 180;
                const r = radius * scale;
                return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
              })
              .join(" ");

            return (
              <polygon
                key={i}
                points={gridPoints}
                fill="none"
                stroke={isDark ? "rgba(201,163,91,0.35)" : "rgba(59,110,168,0.35)"}
                strokeWidth="1.2"
                strokeDasharray={scale === 1 ? undefined : "2 2"}
              />
            );
          })}

          {/* 6 осевых лучей от центра к вершинам */}
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const angle = ((-90 + idx * 60) * Math.PI) / 180;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            return (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={isDark ? "rgba(201,163,91,0.35)" : "rgba(59,110,168,0.35)"}
                strokeWidth="1.2"
              />
            );
          })}

          {/* Заливка профиля (только при движении осей или после запечатывания) */}
          {(isSealed || hasActiveAxes) && (
            <polygon
              points={radarPoints}
              fill={isDark ? "rgba(201,163,91,0.3)" : "rgba(59,110,168,0.25)"}
              stroke={isDark ? "#c9a35b" : "#3b6ea8"}
              strokeWidth="2"
            />
          )}

          {/* Метки осей: Рефлексия, Тяжесть, Погружение, Мрачность, Эпика, Глубина */}
          {AXIS_NAMES.map((name, idx) => {
            const angle = ((-90 + idx * 60) * Math.PI) / 180;
            const labelDist = radius + 15;
            const lx = cx + labelDist * Math.cos(angle);
            const ly = cy + labelDist * Math.sin(angle) + 3;
            return (
              <text
                key={idx}
                x={lx}
                y={ly}
                textAnchor="middle"
                className="font-sans font-medium"
                style={{
                  fontSize: "10.5px",
                  fill: isDark ? "#a89678" : "#6f6553",
                }}
              >
                {name}
              </text>
            );
          })}
        </svg>
      </div>

      {/* ПАСПОРТ ДНК (КОДОВАЯ СТРОКА) СТРОГО ПОД РАДАРОМ */}
      <div
        className="absolute right-[18cqw] bottom-[8cqw] z-20 flex flex-col items-center select-none font-mono"
        style={{ width: "26cqw", fontSize: "1.1cqw" }}
      >
        <span
          className={`font-bold tracking-wider text-center ${
            isDark ? "text-[#efe3cc]/90" : "text-[#2e2a24]/90"
          }`}
        >
          ДНК · {dnaFormula}
        </span>
      </div>

      {/* ВЕКТОРНЫЙ QR-КОД: Винтажная книжная марка с позолоченной окантовкой */}
      <div
        className={`absolute right-[3.6cqw] bottom-[8cqw] z-20 p-[0.45cqw] rounded-[0.4cqw] flex items-center justify-center transition-all ${
          isDark
            ? "bg-[#efe3cc] border border-[rgba(212,175,55,0.6)] shadow-[0_3px_10px_rgba(0,0,0,0.6),inset_0_0_6px_rgba(180,140,80,0.25)]"
            : "bg-[#fffdf7] border border-[rgba(59,110,168,0.4)] shadow-[0_2px_6px_rgba(46,42,36,0.15)]"
        } [&_svg]:w-full [&_svg]:h-full`}
        style={{
          width: "8.6cqw",
          height: "8.6cqw",
          transform: "translateZ(14px)",
        }}
      >
        <ReadingTicketQr
          value={qrValue}
          size={50}
          fgColor={isDark ? "#24160f" : "#1a110c"}
          bgColor="transparent"
          className="w-full h-full"
        />
      </div>
    </div>
  </div>
);
}
