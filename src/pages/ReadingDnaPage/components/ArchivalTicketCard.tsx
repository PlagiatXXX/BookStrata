import { useMemo, useState } from "react";
import type { DnaAxesData, DnaBookItemData } from "@/lib/readingDnaApi";
import { ReadingTicketQr } from "./ReadingTicketQr";
import { useDnaArchetypes } from "../hooks/useDnaArchetypes";
import {
  findArchetypeByIdOrName,
  resolveArchetypeByRanges,
} from "../domain/dnaArchetypeMatch";

export interface ArchivalTicketCardProps {
  ticketNumber?: string;
  archetypeName?: string;
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
  archetypeName = "",
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

  return (
    <div
      style={{ containerType: "inline-size" }}
      className={`relative w-full aspect-[1200/570] rounded-[1.2cqw] border overflow-hidden select-none transition-colors shadow-2xl ${
        isDark
          ? "bg-[#2b1d14] border-[rgba(201,163,91,0.4)] text-[#efe3cc]"
          : "bg-[#fffdf7] border-[rgba(59,110,168,0.4)] text-[#2e2a24]"
      } ${className}`}
    >
      {/* Тонкая декоративная внутренняя рамка с отступом */}
      <div
        className={`absolute inset-[2.2cqw] border rounded-[0.8cqw] pointer-events-none ${
          isDark ? "border-[rgba(201,163,91,0.25)]" : "border-[rgba(59,110,168,0.25)]"
        }`}
      />

      {/* ЛЕВЫЙ ВЕРХНИЙ БЛОК: Заголовок Ордена на месте, титул со слоганом опущены ниже */}
      <div className="absolute left-[5cqw] top-[4.5cqw] w-[42cqw] z-10 flex flex-col justify-start">
        <span
          className={`block uppercase font-sans tracking-[0.16em] opacity-75 font-semibold leading-none ${
            isDark ? "text-[#c9a35b]" : "text-[#3b6ea8]"
          }`}
          style={{ fontSize: "0.85cqw" }}
        >
          {resolvedArchetype
            ? `BOOKSTRATA · ${resolvedArchetype.caste.name.toUpperCase()} · СЕРИЯ «ДНК»`
            : "Тайное общество читателей — BookStrata"}
        </span>

        <h2
          className={`font-['Caveat',cursive] font-bold tracking-tight leading-[1.05] mt-[4.2cqw] ${
            isDark ? "text-[#efe3cc]" : "text-[#2e2a24]"
          }`}
          style={{ fontSize: "3.8cqw" }}
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
              isDark ? "text-[#efe3cc]/85" : "text-[#2e2a24]/85"
            }`}
            style={{ fontSize: "1.4cqw", maxWidth: "42cqw" }}
          >
            «{resolvedArchetype.quote}»
          </p>
        )}
      </div>

      {/* СВЕРХУ ПО ЦЕНТРУ: Номер билета */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 top-[4cqw] z-20 font-['Caveat',cursive] italic font-bold leading-none select-none text-center ${
          isDark ? "text-[#c9a35b]" : "text-[#3b6ea8]"
        }`}
        style={{ fontSize: "2.8cqw" }}
      >
        {isSealed ? ticketNumber : "BS-....."}
      </div>

      {/* БЕЙДЖИ: Номер архетипа и редкость — чуть правее над шкалой */}
      {resolvedArchetype && (
        <div
          className="absolute right-[16.5cqw] top-[4.5cqw] z-20 flex items-center justify-center gap-[0.4cqw] select-none"
          style={{ fontSize: "0.75cqw" }}
        >
          <span
            className={`font-mono font-bold uppercase tracking-wider px-[0.45cqw] py-[0.15cqw] rounded-[0.25cqw] border ${
              isDark
                ? "bg-[#35261b]/80 border-[rgba(201,163,91,0.35)] text-[#c9a35b]"
                : "bg-white/80 border-[rgba(59,110,168,0.35)] text-[#3b6ea8]"
            }`}
          >
            АРХЕТИП №{resolvedArchetype.number}/16
          </span>
          <span
            className={`font-mono font-bold uppercase tracking-wider px-[0.45cqw] py-[0.15cqw] rounded-[0.25cqw] border ${
              isDark
                ? "bg-[#8a2433]/30 border-rose-500/40 text-rose-300"
                : "bg-[#b3412f]/10 border-rose-500/30 text-[#b3412f]"
            }`}
          >
            РЕДКОСТЬ {resolvedArchetype.rarity}%
          </span>
        </div>
      )}

      {/* ПРАВЫЙ ВЕРХНИЙ УГОЛ: Сургучная печать Ордена */}
      <div className="absolute right-[5cqw] top-[4.5cqw] z-20 flex items-center justify-center select-none">
        {isSealed ? (
          sealImageUrl && !sealImgFailed ? (
            <div
              style={{ width: "10.5cqw", height: "10.5cqw" }}
              className="flex items-center justify-center relative select-none"
            >
              <img
                src={sealImageUrl}
                alt="Печать"
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
      <div className="absolute left-[5cqw] bottom-[9.5cqw] z-10 flex items-start gap-[1.6cqw]">
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
        className="absolute right-[20cqw] top-[11cqw] z-10 flex items-center justify-center"
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
        className="absolute right-[20cqw] bottom-[9.5cqw] z-20 flex flex-col items-center select-none font-mono"
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

      {/* ВЕКТОРНЫЙ QR-КОД В ПРАВОМ НИЖНЕМ УГЛУ */}
      <div
        className="absolute right-[5cqw] bottom-[9.5cqw] z-20 bg-white p-[0.4cqw] rounded-[0.4cqw] shadow-xs flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
        style={{ width: "8.5cqw", height: "8.5cqw" }}
      >
        <ReadingTicketQr
          value={qrValue}
          size={50}
          fgColor="#1a110c"
          bgColor="transparent"
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
