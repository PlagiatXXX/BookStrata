interface ThemeFilterChipsProps {
  genres: string[];
  activeGenre: string;
  onGenreChange: (genre: string) => void;
}

export function ThemeFilterChips({
  genres,
  activeGenre,
  onGenreChange,
}: ThemeFilterChipsProps) {
  return (
    <section
      className="px-4 md:px-10 py-5"
      style={{
        background: "linear-gradient(180deg, rgba(134, 69, 42, 0.03) 0%, transparent 100%)",
      }}
    >
      <div className="max-w-[1140px] mx-auto">
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onGenreChange("all")}
            className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer"
            style={{
              fontFamily: "var(--theme-font-label)",
              background:
                activeGenre === "all"
                  ? "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-container) 100%)"
                  : "var(--theme-surface-high)",
              color:
                activeGenre === "all"
                  ? "var(--theme-on-primary-container)"
                  : "var(--theme-on-surface)",
              boxShadow:
                activeGenre === "all"
                  ? "0 2px 8px rgba(134, 69, 42, 0.25), 0 1px 3px rgba(134, 69, 42, 0.15)"
                  : "0 1px 3px rgba(0, 0, 0, 0.06)",
              transform: activeGenre === "all" ? "translateY(-1px)" : "none",
            }}
          >
            Все
          </button>
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => onGenreChange(genre)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
              style={{
                fontFamily: "var(--theme-font-label)",
                background:
                  activeGenre === genre
                    ? "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-container) 100%)"
                    : "var(--theme-surface-high)",
                color:
                  activeGenre === genre
                    ? "var(--theme-on-primary-container)"
                    : "var(--theme-on-surface)",
                boxShadow:
                  activeGenre === genre
                    ? "0 2px 8px rgba(134, 69, 42, 0.25), 0 1px 3px rgba(134, 69, 42, 0.15)"
                    : "0 1px 3px rgba(0, 0, 0, 0.06)",
                transform: activeGenre === genre ? "translateY(-1px)" : "none",
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
