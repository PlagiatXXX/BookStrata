import type { DnaAxesData, DnaBookItemData } from "@/lib/readingDnaApi";
import type { DnaTheme } from "../ReadingDnaPage";

interface StoryTicketCardProps {
  ticketNumber: string;
  customName?: string | null;
  archetypeName: string;
  motto?: string | null;
  axes: DnaAxesData;
  favoriteBooks: DnaBookItemData[];
  kryptoniteBook?: DnaBookItemData | null;
  theme: DnaTheme;
}

const AXES_META: Array<{ key: keyof DnaAxesData; label: string }> = [
  { key: "storyFocus", label: "Сюжет / Рефлексия" },
  { key: "emotionalWeight", label: "Эмоциональный вес" },
  { key: "pace", label: "Темп чтения" },
  { key: "darkness", label: "Свет / Мрак" },
  { key: "scope", label: "Масштаб мира" },
  { key: "complexity", label: "Сложность слога" },
];

/**
 * Вертикальная карточка 540×960 (экспортируется с pixelRatio: 2 → 1080×1920 HD для Stories / Reels / TG).
 * Использует inline-стили и фиксированные размеры, чтобы html-to-image давал стабильный рендер на iOS Safari.
 */
export function StoryTicketCard({
  ticketNumber,
  customName,
  archetypeName,
  motto,
  axes,
  favoriteBooks,
  kryptoniteBook,
  theme,
}: StoryTicketCardProps) {
  const isDark = theme === "dark";
  const bg = isDark
    ? "linear-gradient(160deg, #1a110c 0%, #2a1a10 55%, #120b07 100%)"
    : "linear-gradient(160deg, #fbf8f2 0%, #efe2c6 60%, #e5d2a7 100%)";
  const border = isDark ? "rgba(201, 163, 91, 0.45)" : "rgba(59, 110, 168, 0.4)";
  const accent = isDark ? "#c9a35b" : "#b3412f";
  const textMain = isDark ? "#f5ebd6" : "#2e2a24";
  const textMuted = isDark ? "#c2ae8c" : "#5e5547";
  const trackBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(46,42,36,0.12)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)";

  return (
    <div
      style={{
        width: 540,
        height: 960,
        padding: 32,
        background: bg,
        color: textMain,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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
          padding: "28px 26px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            BOOKSTRATA · КНИЖНЫЙ ДНК
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "monospace",
              color: textMuted,
            }}
          >
            № {ticketNumber}
          </span>
        </div>

        {/* Archetype */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: textMuted }}>
            {customName?.trim() ? `${customName.trim()} · Читательский архетип` : "Мой читательский архетип"}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.15,
              marginTop: 8,
              color: textMain,
            }}
          >
            {archetypeName}
          </div>
          {motto && (
            <div
              style={{
                fontSize: 15,
                fontStyle: "italic",
                lineHeight: 1.45,
                marginTop: 12,
                color: textMuted,
                borderLeft: `3px solid ${accent}`,
                paddingLeft: 12,
              }}
            >
              «{motto.replace(/^[«"']+|[»"']+$/g, "")}»
            </div>
          )}
        </div>

        {/* 6 Axes */}
        <div
          style={{
            marginTop: 20,
            padding: "18px 18px",
            borderRadius: 16,
            background: cardBg,
            border: `1px solid ${border}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            6 осей литературного вкуса
          </div>
          {AXES_META.map(({ key, label }) => {
            const val = Math.max(0, Math.min(100, axes[key] ?? 0));
            return (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: textMuted }}>{label}</span>
                  <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{val}</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: trackBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(4, val)}%`,
                      borderRadius: 999,
                      background: accent,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Favorite books */}
        {favoriteBooks.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: textMuted,
                marginBottom: 10,
              }}
            >
              3 священные книги
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {favoriteBooks.slice(0, 3).map((book, idx) => (
                <div
                  key={`${book.title}-${idx}`}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: cardBg,
                    border: `1px solid ${border}`,
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {idx + 1}. {book.title}
                  </span>
                  {book.author && (
                    <span style={{ color: textMuted, flexShrink: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {book.author}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kryptonite book */}
        {kryptoniteBook && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isDark ? "#fb7185" : "#b3412f",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>☠ Книга-криптонит · Иммунитет</span>
            </div>
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                background: isDark ? "rgba(190, 18, 60, 0.18)" : "rgba(179, 65, 47, 0.08)",
                border: isDark ? "1px solid rgba(251, 113, 133, 0.45)" : "1px solid rgba(179, 65, 47, 0.35)",
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: isDark ? "#fecdd3" : "#8a2433",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {kryptoniteBook.title}
              </span>
              {kryptoniteBook.author && (
                <span
                  style={{
                    color: isDark ? "rgba(254, 205, 211, 0.75)" : "rgba(138, 36, 51, 0.75)",
                    flexShrink: 0,
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {kryptoniteBook.author}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: textMain }}>
              Сравни вкус со мной
            </div>
            <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
              bookstrata.ru/reading-dna
            </div>
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: accent,
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "monospace",
            }}
          >
            {ticketNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
