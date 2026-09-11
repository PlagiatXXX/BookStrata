// src/pages/BookPage/BookReadingGuide.tsx
// «Гид по чтению» — AI-паспорт книги (Book.readingGuide): Bento Grid с
// параметрами чтения, аудиторией/анти-аудиторией и тезисами. Рендерится
// ТОЛЬКО при заполненном паспорте; без него страница не меняется.
// ВАЖНО для SEO: текст блока попадает в пререндер-HTML (added value
// страницы книги).
import { Clock, Compass, CheckCircle2, XCircle, Brain, Rabbit, Squirrel, Turtle } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { HanddrawnHeart } from "@/components/ui/handdrawn-heart";
import type { ReadingGuide } from "@/lib/bookApi";

export type ReadingPace = "быстрый" | "размеренный" | "медленный" | string;
export type Difficulty = "легко" | "средне" | "сложно" | string;

export interface BookReadingGuideProps {
  guide: ReadingGuide;
  className?: string;
}

// ─── Шкалы темпа и сложности ────────────────────────────────────────────────

const PACE_CONFIG: Record<string, { label: string; active: number; color: string; icon: typeof Rabbit; iconTitle: string }> = {
  "быстрый": { label: "Быстрый", active: 3, color: "text-emerald-400", icon: Rabbit, iconTitle: "Заяц" },
  "размеренный": { label: "Размеренный", active: 2, color: "text-amber-400", icon: Squirrel, iconTitle: "Белка" },
  "медленный": { label: "Медленный", active: 1, color: "text-indigo-400", icon: Turtle, iconTitle: "Черепаха" },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; active: number; color: string; dotColor: string }> = {
  "легко": { label: "Легко", active: 1, color: "text-green-400", dotColor: "bg-green-400" },
  "средне": { label: "Средне", active: 2, color: "text-amber-400", dotColor: "bg-amber-400" },
  "сложно": { label: "Сложно", active: 3, color: "text-rose-400", dotColor: "bg-rose-400" },
};

/**
 * Резолвит ключ шкалы из свободного текста AI: lowercase + trim + алиасы.
 * («Размеренный» → «размеренный», «Средняя сложность» → «средне»).
 */
function resolveScaleKey<T extends Record<string, unknown>>(
  config: T,
  value: string,
  aliases: Record<string, string>,
): keyof T | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized in config) return normalized as keyof T;
  const alias = aliases[normalized];
  if (alias && alias in config) return alias as keyof T;
  return undefined;
}

/** Алиасы свободных формулировок AI → ключи конфига.
 *  Верхние три — канонические значения бэк-enum'а (readingGuide.schema),
 *  остальные — вариации, которые встречаются в данных. */
const PACE_ALIASES: Record<string, string> = {
  "динамичный": "быстрый",
  "медитативный": "медленный",
  "быстрая": "быстрый",
  "средняя": "размеренный",
  "умеренный": "размеренный",
  "спокойный": "размеренный",
  "медленная": "медленный",
  "тягучий": "медленный",
};

const DIFFICULTY_ALIASES: Record<string, string> = {
  "легкое чтение": "легко",
  "высокий порог входа": "сложно",
  "средняя сложность": "средне",
  "лёгкая сложность": "легко",
  "легкая сложность": "легко",
  "высокая сложность": "сложно",
  "тяжело": "сложно",
  "средний": "средне",
  "легкий": "легко",
  "лёгкий": "легко",
};

// Порядок животных темпа: черепаха → белка → заяц (от медленного к быстрому)
const PACE_ANIMALS: { icon: typeof Rabbit; title: string }[] = [
  { icon: Turtle, title: "Черепаха" },
  { icon: Squirrel, title: "Белка" },
  { icon: Rabbit, title: "Заяц" },
];

function PaceScale({ value }: { value: string }) {
  const key = resolveScaleKey(PACE_CONFIG, value, PACE_ALIASES);
  const config = key ? PACE_CONFIG[key] : undefined;
  if (!config) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
        {value}
      </span>
    );
  }
  return (
    <div className="group/scale relative flex items-center gap-3">
      <div className="flex items-center gap-1.5" aria-label={`Темп: ${config.label}`}>
        {PACE_ANIMALS.map(({ icon: Icon, title }, idx) => {
          const isActive = idx + 1 === config.active;
          return (
            <span key={title} title={title} className="inline-flex">
              <Icon
                className={`h-4 w-4 transition-all duration-200 ${
                  isActive ? `${config.color} scale-125 drop-shadow-[0_0_6px_currentColor]` : "text-white/25"
                }`}
                aria-hidden="true"
              />
            </span>
          );
        })}
      </div>
      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900 px-3 py-1.5 text-xs text-white/80 opacity-0 shadow-xl transition-opacity duration-200 group-hover/scale:opacity-100">
        {key === "быстрый" && "Быстрый темп, короткие главы"}
        {key === "размеренный" && "Спокойное чтение, развёрнутые описания"}
        {key === "медленный" && "Тягучий стиль, много философии"}
      </div>
    </div>
  );
}

function DifficultyScale({ value }: { value: string }) {
  const key = resolveScaleKey(DIFFICULTY_CONFIG, value, DIFFICULTY_ALIASES);
  const config = key ? DIFFICULTY_CONFIG[key] : undefined;
  if (!config) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
        {value}
      </span>
    );
  }
  return (
    <div className="group/scale relative flex items-center gap-3">
      <div className="flex gap-1.5" aria-label={`Сложность: ${config.label}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${
              i <= config.active ? config.dotColor : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900 px-3 py-1.5 text-xs text-white/80 opacity-0 shadow-xl transition-opacity duration-200 group-hover/scale:opacity-100">
        {key === "легко" && "Доступно каждому, без сложного лексикона"}
        {key === "средне" && "Нужно внимание к деталям и контексту"}
        {key === "сложно" && "Академичный стиль, плотный текст"}
      </div>
    </div>
  );
}

// ─── Карточки Bento Grid ────────────────────────────────────────────────────

function VibeCard({ guide }: { guide: ReadingGuide }) {
  const vibes = guide.vibe
    ? guide.vibe.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

  if (vibes.length === 0) return null;

  return (
    <div className="md:col-span-3 flex justify-center md:justify-end md:pr-2">
      <div className="bp-vibe-ticket">
        {/* Заголовок */}
        <div className="bp-vibe-ticket-header">+ ВАЙБ <HanddrawnHeart size={26} /></div>

        {/* Теги */}
        <div className="bp-vibe-ticket-body">
          {vibes.map((v) => (
            <span key={v} className="bp-vibe-tag">
              <Highlighter action="underline" color="#c97d60" strokeWidth={1.5} iterations={2} padding={2} animationDuration={600}>
                {v}
              </Highlighter>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HookCard({ guide }: { guide: ReadingGuide }) {
  return (
    <div className="md:col-span-5 relative rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-5 transition-colors duration-300 hover:border-white/20">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
        О книге
      </h3>

      <blockquote className="border-l-2 border-amber-400/40 pl-4">
        <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">
          {guide.short_hook}
        </p>
      </blockquote>
    </div>
  );
}

function MetricsCard({ guide }: { guide: ReadingGuide }) {
  return (
    <div className="md:col-span-4 rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-5 transition-colors duration-300 hover:border-white/20">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        <Compass className="h-3.5 w-3.5" />
        Параметры чтения
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
          <span className="flex items-center gap-2 text-xs text-white/50">
            <Clock className="h-3.5 w-3.5" />
            Темп
          </span>
          <PaceScale value={guide.reading_pace} />
        </div>

        <div className="flex items-center justify-between gap-3 py-2">
          <span className="flex items-center gap-2 text-xs text-white/50">
            <Brain className="h-3.5 w-3.5" />
            Сложность
          </span>
          <DifficultyScale value={guide.difficulty} />
        </div>
      </div>
    </div>
  );
}

function AudienceCard({ guide }: { guide: ReadingGuide }) {
  const hasAnti = Boolean(guide.friction_points);

  return (
    <div className="md:col-span-12">
      <div className={`grid ${hasAnti ? "grid-cols-1 md:grid-cols-[1fr_auto_1fr]" : "grid-cols-1"} gap-4 md:gap-6 items-center`}>
        {/* Зелёная зона — кому читать */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 md:p-5">
          <h3 className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Кому понравится
          </h3>
          <p className="text-sm leading-relaxed text-white/80">
            {guide.target_audience}
          </p>
        </div>

        {/* Маскот «раздвигает» блоки — только desktop, на мобиле скрыт */}
        {hasAnti && (
          <img
            src="/bookstrazh-books.webp"
            alt="Маскот BookStrata"
            loading="lazy"
            className="hidden md:block self-center justify-self-center h-64 w-auto object-contain select-none pointer-events-none"
          />
        )}

        {/* Серая зона — кому пропустить */}
        {hasAnti && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 md:p-5">
            <h3 className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <XCircle className="h-4 w-4" />
              Кому пропустить
            </h3>
            <p className="text-sm leading-relaxed text-white/70">
              {guide.friction_points}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TakeawaysCard({ takeaways }: { takeaways: string[] }) {
  if (takeaways.length === 0) return null;

  return (
    <div className="md:col-span-12 rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-5 mt-6 transition-colors duration-300 hover:border-white/20">
      <span className="mb-4 block text-xs font-semibold uppercase tracking-wider text-white/50">
        Ключевые акценты
      </span>

      <div className="bp-book-shelf">
        {takeaways.map((point, idx) => (
          <div key={idx} className="bp-book-panel">
            <span className="bp-book-num">0{idx + 1}</span>
            <span className="bp-book-text">{point}</span>
            <span className="bp-book-mobile-text">{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Основной компонент ─────────────────────────────────────────────────────

export function BookReadingGuide({ guide, className }: BookReadingGuideProps) {
  const takeaways = guide.key_takeaways.filter(Boolean);

  return (
    <section className={`relative py-4 md:py-12 border-t border-primary/20 ${className ?? ""}`} aria-label="Гид по чтению">
      <div className="max-w-275 mx-auto px-4 md:px-5">
        {/* Заголовок блока */}
        <div className="mb-8 text-center">
          <h2 className="bp-display text-white tracking-[0.2em] uppercase text-xl md:text-2xl mb-2">
            Гид по чтению
          </h2>
          <div className="w-24 h-px bg-(--bp-primary) mx-auto" />
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <VibeCard guide={guide} />
          <HookCard guide={guide} />
          <MetricsCard guide={guide} />
          <AudienceCard guide={guide} />
          <TakeawaysCard takeaways={takeaways} />
        </div>
      </div>
    </section>
  );
}
