import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuthContext";

export function CreateRatingCta() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative min-h-75 flex items-center justify-center py-12 overflow-hidden bg-cover bg-center">
      <img src="/images/rankings/hero-down.avif" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-b from-background via-background/40 to-background pointer-events-none" />
      {/* Кометы */}
      <span className="rankings-comet rankings-comet-1" />
      <span className="rankings-comet rankings-comet-2" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-3xl">
        <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-md p-6 md:p-8 max-w-xl mx-auto relative overflow-hidden">
          {/* Декоративные уголки */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/40" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/40" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/40" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/40" />

          <h2 className="text-xl md:text-2xl font-extrabold uppercase text-white text-glow mb-3">
            Создай свой рейтинг
          </h2>
          <p className="text-sm text-white/90 mb-6 max-w-md mx-auto font-medium">
            Собери собственную подборку любимых книг в формате топ-листа и поделись с сообществом
          </p>

          <Link
            to={isAuthenticated ? "/templates" : "/auth?mode=register"}
            className="group relative mx-auto px-6 py-2.5 bg-white text-(--bg-0) font-bold text-sm rounded-lg hover:bg-(--global-surface-high) transition-all duration-300 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Создать рейтинг
            <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
