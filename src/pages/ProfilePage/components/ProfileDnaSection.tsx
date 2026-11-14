// src/pages/ProfilePage/components/ProfileDnaSection.tsx
// Секция читательского ДНК в профиле пользователя.
import { Link } from "react-router-dom";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";

export interface ProfileDnaSectionProps {
  dna: ReadingDnaResponseData | null;
  isLoading: boolean;
}

export function ProfileDnaSection({ dna, isLoading }: ProfileDnaSectionProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Читательский ДНК"
        data-testid="dna-section-loading"
        className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="h-10 w-full rounded-xl bg-white/5" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Читательский ДНК"
      className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Читательский ДНК
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Литературный психотип, оси восприятия и совместимость
          </p>
        </div>
        {dna && (
          <span className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-300">
            {dna.ticketNumber}
          </span>
        )}
      </div>

      {!dna ? (
        <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-white/70">
            Вы ещё не прошли тест на читательский ДНК. Пройдите 6 осей восприятия, найдите свой архетип и откройте литературных близнецов.
          </p>
          <Link
            to="/reading-dna"
            className="shrink-0 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-stone-950 transition hover:opacity-90"
          >
            Пройти тест
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-base font-medium text-white">
              {dna.archetypeName}
            </div>
            {dna.motto && (
              <p className="mt-1 text-xs italic text-white/50">
                «{dna.motto}»
              </p>
            )}
            {dna.archetypeDesc && (
              <p className="mt-1.5 text-xs text-white/60 line-clamp-2">
                {dna.archetypeDesc}
              </p>
            )}
          </div>
          <Link
            to={`/reading-dna?ticket=${dna.ticketNumber}`}
            className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-white/20"
          >
            Открыть билет
          </Link>
        </div>
      )}
    </section>
  );
}
