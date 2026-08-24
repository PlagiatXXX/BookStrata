import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles, Rocket, Landmark, Lightbulb, Feather, GraduationCap, ScrollText, Ghost, Cpu, Heart, Flame, Map, Search, Eye, Flower2, LibraryBig, Languages, Shield, MoonStar, BookOpen } from "lucide-react";
import { CATEGORIES } from "@/data/categories";

const GENRE_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  fantasy: Sparkles, "sci-fi": Rocket, classics: Landmark,
  "non-fiction": Lightbulb, fiction: Feather, "young-adult": GraduationCap,
  historical: ScrollText, horror: Ghost, cyberpunk: Cpu, romance: Heart,
  "slavic-fantasy": Flame, adventure: Map, thriller: Search, dystopia: Eye,
  japanese: Flower2, "russian-classics": LibraryBig,
  "foreign-prose": Languages, military: Shield, myths: MoonStar,
};

const NEON_COLORS = [
  "border-secondary-fixed-dim text-secondary-fixed-dim shadow-[0_0_15px_rgba(0,219,233,0.7),0_0_35px_rgba(0,219,233,0.3)]",
  "border-primary text-primary shadow-[0_0_15px_rgba(236,178,255,0.7),0_0_35px_rgba(236,178,255,0.3)]",
  "border-primary-container text-primary-container shadow-[0_0_15px_rgba(189,0,255,0.7),0_0_35px_rgba(189,0,255,0.3)]",
];

export function GenreNavigation() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const genres = CATEGORIES.filter((c) => c.id !== "all");

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <section className="w-full py-10 bg-gradient-to-b from-transparent to-surface-container-lowest">
      <div className="max-w-[1280px] mx-auto px-4 md:px-16 text-center">
        <h2 className="font-display text-xl md:text-2xl text-on-surface mb-1 font-bold text-glow-subtle">
          Навигация по жанрам
        </h2>
        <p className="text-xs text-on-surface-variant mb-8">
          Собери собственную подборку любимых книг в формате топ-листа
        </p>

        <div className="relative flex items-center justify-center w-full group">
          {/* Стрелка влево */}
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 md:left-4 z-10 w-10 h-10 bg-surface/50 backdrop-blur-md rounded-full border border-primary/50 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(236,178,255,0.3)] hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Карусель жанров */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto rankings-no-scrollbar py-6 px-4 md:px-16 w-full max-w-4xl mx-auto items-center snap-x snap-mandatory"
          >
            {genres.map((genre, i) => {
              const Icon = GENRE_ICONS[genre.id] || BookOpen;
              const colorClass = NEON_COLORS[i % NEON_COLORS.length];
              const isLong = genre.label.length > 10;

              return (
                <Link
                  key={genre.id}
                  to={`/topics/${genre.id}`}
                  className="flex flex-col items-center gap-2 snap-center shrink-0 w-20 group/item"
                >
                  <div className={`w-16 h-16 rounded-full border-2 ${colorClass} flex items-center justify-center group-hover/item:bg-white/5 transition-all bg-background/50 backdrop-blur`}>
                    <Icon className="text-3xl" size={28} />
                  </div>
                  <span className={`font-mono uppercase tracking-widest text-white text-center whitespace-nowrap leading-tight font-bold ${isLong ? "text-[8px]" : "text-[10px]"}`}>
                    {genre.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Стрелка вправо */}
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 md:right-4 z-10 w-10 h-10 bg-surface/50 backdrop-blur-md rounded-full border border-secondary-fixed-dim/50 flex items-center justify-center text-secondary-fixed-dim shadow-[0_0_15px_rgba(0,219,233,0.3)] hover:bg-secondary-fixed-dim/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
