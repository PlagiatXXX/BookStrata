import type {
  ReadingDnaResponseData,
  ReadingDnaDuelResultData,
} from "@/lib/readingDnaApi";

export interface DuelExportCardProps {
  format: "card" | "stories";
  myTicket: ReadingDnaResponseData | null;
  opponent: ReadingDnaResponseData | null;
  opponentTicketNumber?: string | null;
  duelResult: ReadingDnaDuelResultData;
  conflictBookTitle?: string | null;
  theme?: "dark" | "craft" | "light";
}

const AXIS_NAMES = [
  "Рефлексия",
  "Тяжесть",
  "Погружение",
  "Мрачность",
  "Эпика",
  "Глубина",
];

function buildRadarPoints(values: number[], cx: number, cy: number, radius: number): string {
  return values
    .map((val, idx) => {
      const angle = (Math.PI / 3) * idx - Math.PI / 2;
      const r = (Math.max(10, Math.min(100, val)) / 100) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Экспортная карточка результата книжной дуэли:
 * - format="card": 600×760 (×2 = 1200×1520 HD для Telegram / VK / чатов)
 * - format="stories": 540×960 (×2 = 1080×1920 HD 9:16 для Stories / Reels)
 * Использует inline-стили и фиксированные размеры для стабильного рендера html-to-image.
 */
export function DuelExportCard({
  format,
  myTicket,
  opponent,
  opponentTicketNumber,
  duelResult,
  conflictBookTitle,
  theme = "dark",
}: DuelExportCardProps) {
  const isDark = theme === "dark";
  const isStories = format === "stories";
  const isConflict = Boolean(duelResult.breakdown?.kryptoniteConflict);

  const width = isStories ? 540 : 600;
  const height = isStories ? 960 : 760;

  const bg = isDark
    ? "linear-gradient(160deg, #1a110c 0%, #2a1a10 55%, #120b07 100%)"
    : "linear-gradient(160deg, #fbf8f2 0%, #efe2c6 60%, #e5d2a7 100%)";
  const border = isConflict
    ? "rgba(225, 29, 72, 0.55)"
    : isDark
      ? "rgba(201, 163, 91, 0.45)"
      : "rgba(59, 110, 168, 0.4)";
  const accent = isConflict
    ? isDark
      ? "#fb7185"
      : "#be123c"
    : isDark
      ? "#f4d03f"
      : "#3b6ea8";
  const accentSoft = isDark ? "#c9a35b" : "#3b6ea8";
  const opponentColor = "#c86d28";
  const textMain = isDark ? "#f5ebd6" : "#2e2a24";
  const textMuted = isDark ? "#c2ae8c" : "#5e5547";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)";

  const myName = myTicket?.customName?.trim() || "Вы";
  const myNum = myTicket?.ticketNumber || "BS-.....";
  const oppName = opponent?.customName?.trim() || "Собеседник";
  const oppNum = opponent?.ticketNumber || opponentTicketNumber || "BS-.....";

  const userValues = myTicket
    ? [
        myTicket.axes.storyFocus || 50,
        myTicket.axes.emotionalWeight || 50,
        myTicket.axes.pace || 50,
        myTicket.axes.darkness || 50,
        myTicket.axes.scope || 50,
        myTicket.axes.complexity || 50,
      ]
    : [50, 50, 50, 50, 50, 50];

  const opponentValues = opponent
    ? [
        opponent.axes.storyFocus || 50,
        opponent.axes.emotionalWeight || 50,
        opponent.axes.pace || 50,
        opponent.axes.darkness || 50,
        opponent.axes.scope || 50,
        opponent.axes.complexity || 50,
      ]
    : [50, 50, 50, 50, 50, 50];

  const radarSize = isStories ? 250 : 228;
  const cx = radarSize / 2;
  const cy = radarSize / 2;
  const radius = isStories ? 80 : 72;

  const userPoints = buildRadarPoints(userValues, cx, cy, radius);
  const opponentPoints = buildRadarPoints(opponentValues, cx, cy, radius);

  return (
    <div
      style={{
        width,
        height,
        padding: isStories ? 28 : 24,
        background: bg,
        color: textMain,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          border: `2px solid ${border}`,
          borderRadius: 24,
          padding: isStories ? "26px 24px" : "22px 24px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: accentSoft,
            }}
          >
            BOOKSTRATA · КНИЖНАЯ ДУЭЛЬ
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "monospace",
              color: textMuted,
            }}
          >
            {myNum} × {oppNum}
          </span>
        </div>

        {/* Percentage + Verdict */}
        <div style={{ textAlign: "center", marginTop: isStories ? 14 : 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: textMuted,
            }}
          >
            СОВМЕСТИМОСТЬ ВКУСОВ
          </div>
          <div
            style={{
              fontSize: isStories ? 76 : 68,
              fontWeight: 900,
              lineHeight: 1.02,
              fontFamily: "monospace",
              color: accent,
              marginTop: 6,
            }}
          >
            {duelResult.compatibility}%
          </div>
          <div
            style={{
              fontSize: isStories ? 20 : 18,
              fontWeight: 800,
              lineHeight: 1.28,
              marginTop: 8,
              color: textMain,
              padding: "0 8px",
            }}
          >
            {duelResult.verdict}
          </div>
        </div>

        {/* Kryptonite conflict banner */}
        {isConflict && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: isDark ? "rgba(190, 18, 60, 0.25)" : "rgba(190, 18, 60, 0.1)",
              border: `1px solid ${isDark ? "rgba(251, 113, 133, 0.55)" : "rgba(190, 18, 60, 0.35)"}`,
              color: isDark ? "#fecdd3" : "#9f1239",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.35,
            }}
          >
            ☠ КРИПТОНИТ-КОНФЛИКТ (−{duelResult.breakdown?.kryptonitePenalty || 25}%)
            {conflictBookTitle ? `: «${conflictBookTitle}»` : ""}
          </div>
        )}

        {/* Dual Radar */}
        <div
          style={{
            marginTop: 12,
            padding: isStories ? "14px 12px" : "10px 12px",
            borderRadius: 16,
            background: cardBg,
            border: `1px solid ${border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <svg
            width={radarSize}
            height={radarSize}
            viewBox={`0 0 ${radarSize} ${radarSize}`}
            style={{ overflow: "visible" }}
          >
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
                  stroke={isDark ? "rgba(201,163,91,0.28)" : "rgba(59,110,168,0.28)"}
                  strokeWidth="1"
                  strokeDasharray={scale === 1 ? undefined : "2 2"}
                />
              );
            })}

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
                  stroke={isDark ? "rgba(201,163,91,0.22)" : "rgba(59,110,168,0.22)"}
                  strokeWidth="1"
                />
              );
            })}

            <polygon
              points={userPoints}
              fill={isDark ? "rgba(244,208,63,0.28)" : "rgba(59,110,168,0.24)"}
              stroke={isDark ? "#f4d03f" : "#3b6ea8"}
              strokeWidth="2.5"
            />

            <polygon
              points={opponentPoints}
              fill="rgba(200, 109, 40, 0.22)"
              stroke={opponentColor}
              strokeWidth="2.2"
              strokeDasharray="5 3"
            />

            {AXIS_NAMES.map((name, idx) => {
              const angle = (Math.PI / 3) * idx - Math.PI / 2;
              const labelDist = radius + 18;
              const lx = cx + labelDist * Math.cos(angle);
              const ly = cy + labelDist * Math.sin(angle) + 4;
              return (
                <text
                  key={idx}
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  fill={textMuted}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {name}
                </text>
              );
            })}
          </svg>

          {/* Participants legend */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: textMain,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: isDark ? "#f4d03f" : "#3b6ea8",
                  display: "inline-block",
                }}
              />
              {myName}
              {myTicket?.archetypeName ? ` (${myTicket.archetypeName})` : ""}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: opponentColor,
                  display: "inline-block",
                }}
              />
              {oppName}
              {opponent?.archetypeName ? ` (${opponent.archetypeName})` : ""}
            </span>
          </div>
        </div>

        {/* Extra breakdown / opponent books for Stories */}
        {isStories && opponent && opponent.favoriteBooks.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: textMuted,
                marginBottom: 8,
              }}
            >
              Раскрытые книги · {oppName}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {opponent.favoriteBooks.slice(0, 3).map((book, idx) => (
                <div
                  key={`${book.title}-${idx}`}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 10,
                    background: cardBg,
                    border: `1px solid ${border}`,
                    fontSize: 12,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {idx + 1}. {book.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: textMain }}>
              Проверь книжную совместимость
            </div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
              bookstrata.ru/reading-dna
            </div>
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: isConflict ? "#be123c" : isDark ? "#8a2433" : "#b3412f",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "monospace",
            }}
          >
            {duelResult.compatibility}% MATCH
          </div>
        </div>
      </div>
    </div>
  );
}
