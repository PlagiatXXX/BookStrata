import type { ReactNode } from "react";

interface ThemeHeroSplitProps {
  breadcrumbs?: ReactNode;
  title: string;
  author?: string;
  bookCount?: number;
  coverImageUrl?: string;
}

export function ThemeHeroSplit({
  breadcrumbs,
  title,
  author,
  bookCount,
  coverImageUrl,
}: ThemeHeroSplitProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 px-4 md:px-10">
      {/* Warm gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #fdf6ee 0%, #f5e6d0 30%, #edc9a3 60%, #e8bf8a 100%)",
        }}
      />

      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-[1140px] mx-auto flex flex-col md:flex-row gap-8 relative z-10">
        {/* Left: text content */}
        <div className="md:w-2/3 flex flex-col justify-center">
          {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}

          <h1
            className="text-3xl md:text-5xl font-semibold leading-tight mb-4"
            style={{
              fontFamily: "var(--theme-font-headline)",
              fontWeight: "var(--theme-font-headline-weight)",
              color: "var(--theme-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-0.5 w-12"
              style={{ background: "var(--theme-primary)" }}
            />
            <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-40">
              <path
                d="M6 1 C7 3, 9 4, 10 6 C11 8, 9 11, 6 11 C3 11, 1 8, 2 6 C3 4, 5 3, 6 1Z"
                fill="var(--theme-primary)"
              />
            </svg>
            <div
              className="h-0.5 w-12"
              style={{ background: "var(--theme-primary)" }}
            />
          </div>

          {author && (
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-sm"
                style={{
                  fontFamily: "var(--theme-font-body)",
                  color: "var(--theme-on-surface-variant)",
                }}
              >
                автор:
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  fontFamily: "var(--theme-font-label)",
                  color: "var(--theme-primary)",
                }}
              >
                {author}
              </span>
            </div>
          )}

          {bookCount && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
              style={{
                background: "rgba(134, 69, 42, 0.08)",
                color: "var(--theme-primary)",
                fontFamily: "var(--theme-font-label)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined text-[16px]">book</span>
              <span>{bookCount} книг</span>
            </div>
          )}
        </div>

        {/* Right: cover image */}
        {coverImageUrl && (
          <div className="md:w-1/3 relative h-64 md:h-auto">
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg"
              style={{
                border: "3px solid rgba(134, 69, 42, 0.15)",
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${coverImageUrl}')` }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(56, 33, 16, 0.3) 0%, transparent 50%)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
