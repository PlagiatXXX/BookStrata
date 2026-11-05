import { Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { RankingsSearchBar } from "./RankingsSearchBar";

interface RankingsHeroProps {
  onAiOpen: () => void;
}

export function RankingsHero({ onAiOpen }: RankingsHeroProps) {
  return (
    <section className="relative w-full min-h-75 pt-6 pb-0 px-4 md:px-16 max-w-7xl mx-auto">
      {/* Фон-книга (CSS background вместо блокирующего <img> для предотвращения завышения LCP) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="w-full h-full bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/images/rankings/hero-book3.webp')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-linear-to-b from-background/60 via-background/40 to-background" />
      </div>

      {/* Двухколоночный грид */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Левая колонка — текст */}
        <div>
          <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Рейтинг книг" }]} />

          <h1 className="font-display text-3xl md:text-5xl font-extrabold uppercase text-white text-glow mt-3">
            Рейтинг книг
          </h1>

          <p className="text-base md:text-lg text-on-surface-variant max-w-xl mt-3">
            Редакционные подборки BookStrata — лучшие книги по жанрам, чтобы вам было проще найти что почитать.
          </p>

          <button
            type="button"
            onClick={onAiOpen}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs uppercase tracking-widest neon-border-cyan text-cyan-300 hover:bg-cyan-500/10 transition-all cursor-pointer"
          >
            <Sparkles size={14} />
            Спросить у Букстража
          </button>
        </div>

        {/* Правая колонка — поиск */}
        <div className="mt-2 md:mt-12 mb-4 md:mb-0">
          <RankingsSearchBar />
        </div>
      </div>
    </section>
  );
}
