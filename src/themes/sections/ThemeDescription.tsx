interface ThemeDescriptionProps {
  excerpt?: string | null;
  editorialNote?: string | null;
}

export function ThemeDescription({ excerpt, editorialNote }: ThemeDescriptionProps) {
  if (!excerpt && !editorialNote) return null;

  return (
    <div
      className="relative p-6 mb-8 rounded-xl overflow-hidden"
      style={{
        background: "rgba(134, 69, 42, 0.08)",
        borderLeft: "4px solid var(--theme-primary)",
        boxShadow: "0 2px 12px rgba(134, 69, 42, 0.1)",
      }}
    >
      {/* Subtle corner decoration */}
      <svg
        className="absolute top-3 right-3 opacity-[0.06] w-16 h-16"
        viewBox="0 0 100 100"
        fill="none"
      >
        <path
          d="M50 5 C60 20, 85 30, 90 55 C95 75, 75 95, 50 95 C25 95, 5 75, 10 55 C15 30, 40 20, 50 5Z"
          fill="var(--theme-primary)"
        />
      </svg>

      {excerpt ? (
        <p
          className="text-lg font-medium leading-relaxed relative z-10"
          style={{
            fontFamily: "var(--theme-font-body)",
            color: "var(--theme-ink)",
          }}
        >
          {excerpt}
        </p>
      ) : null}
      {editorialNote ? (
        <>
          <div className="flex items-center gap-2 mt-4 mb-3 relative z-10">
            <div
              className="h-px flex-grow"
              style={{ background: "var(--theme-outline-variant)" }}
            />
            <h2
              className="text-xs font-bold tracking-widest uppercase whitespace-nowrap"
              style={{
                fontFamily: "var(--theme-font-label)",
                color: "var(--theme-primary)",
              }}
            >
              Как составлялась подборка
            </h2>
            <div
              className="h-px flex-grow"
              style={{ background: "var(--theme-outline-variant)" }}
            />
          </div>
          <p
            className="text-base leading-relaxed relative z-10"
            style={{
              fontFamily: "var(--theme-font-body)",
              color: "var(--theme-ink)",
              opacity: 0.8,
            }}
          >
            {editorialNote}
          </p>
        </>
      ) : null}
    </div>
  );
}
