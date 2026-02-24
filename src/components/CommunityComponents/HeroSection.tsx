import { Search as SearchIcon } from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const HeroSection = ({ searchQuery, setSearchQuery }: HeroSectionProps) => {
  return (
    <section className="py-14 md:py-18 reveal" data-reveal>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-1)">
        Редакционные статьи сообщества
      </p>
      <h1 className="community-heading mb-8 max-w-4xl text-3xl font-extrabold leading-[0.95] sm:text-5xl md:text-7xl">
        Найдите свой следующий
        <span className="block text-(--accent-main)">книжный тир-лист</span>
      </h1>

      <div className="max-w-3xl">
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 brutal-card brutal-border p-2">
          <SearchIcon className="absolute left-6 text-(--ink-1)" size={20} />
          <input
            className="w-full bg-transparent border-none rounded-sm py-4 pl-14 pr-4 sm:pr-40 text-base text-(--ink-0) placeholder:text-(--ink-1) focus:outline-none"
            placeholder="Поиск вдохновения..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button className="w-full sm:absolute sm:right-2 sm:top-1/2 sm:w-auto sm:-translate-y-1/2 brutal-cta px-6 py-2.5 text-xs font-semibold uppercase tracking-widest cursor-pointer">
            Поиск
          </button>
        </div>
      </div>
    </section>
  );
};
