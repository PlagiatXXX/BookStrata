import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Trophy,
  Bookmark,
  BookOpen,
  HelpCircle,
  Users,
  Sparkles,
  ArrowUpRight,
  Swords,
  Feather,
} from "lucide-react";
import { getReadingTwins, type ReadingDnaResponseData } from "@/lib/readingDnaApi";

export interface OnboardingHubProps {
  ticketNumber?: string;
  archetypeName?: string;
  casteName?: string;
  theme?: "dark" | "craft";
}

export function OnboardingHub({
  ticketNumber,
  archetypeName,
  casteName,
  theme = "dark",
}: OnboardingHubProps) {
  const isDark = theme === "dark";

  // Запрос книжных близнецов при наличии номера билета
  const { data: twinsData, isLoading: isTwinsLoading } = useQuery({
    queryKey: ["readingDna", "twins", ticketNumber],
    queryFn: () => (ticketNumber ? getReadingTwins(ticketNumber, 4) : null),
    enabled: Boolean(ticketNumber),
  });

  const twins = twinsData?.twins || [];

  const platformCards = [
    {
      title: "Создай свой тир-лист",
      desc: "Разложи прочитанные книги по рангам S, A, B, C, D на интерактивной доске и поделись с миром.",
      icon: <Layers size={22} className="text-amber-400" />,
      link: "/templates",
      cta: "Создать тир-лист",
      badge: "Популярно",
    },
    {
      title: "Книжные рейтинги",
      desc: "Узнай, какие произведения занимают верхние строчки в оценках сообщества читателей.",
      icon: <Trophy size={22} className="text-yellow-400" />,
      link: "/rankings",
      cta: "Смотреть рейтинги",
    },
    {
      title: "Полки знаменитостей",
      desc: "Исследуй персональные библиотеки и рекомендации мыслителей, писателей и кумиров.",
      icon: <Bookmark size={22} className="text-emerald-400" />,
      link: "/celebrities",
      cta: "Смотреть полки",
    },
    {
      title: "Каталог авторов",
      desc: "Изучай биографии, полные библиографии и фанатские рейтинги книг любимых писателей.",
      icon: <Feather size={22} className="text-sky-400" />,
      link: "/authors",
      cta: "Открыть каталог",
    },
    {
      title: "Литературный блог",
      desc: "Свежие обзоры, книжные эссе, глубокие анализы и вдохновляющие статьи редакции.",
      icon: <BookOpen size={22} className="text-rose-400" />,
      link: "/blog",
      cta: "Читать блог",
    },
    {
      title: "Частые вопросы (FAQ)",
      desc: "Как устроен расчет уровней, правила сообщества и советы по использованию платформы.",
      icon: <HelpCircle size={22} className="text-purple-400" />,
      link: "/faq",
      cta: "Открыть FAQ",
    },
  ];

  return (
    <div className="space-y-12 mt-12 pt-12 border-t border-dashed border-amber-500/20">
      {/* СЕКЦИЯ 1: КНИЖНЫЕ БЛИЗНЕЦЫ */}
      {ticketNumber && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <Users size={14} />
                <span>Книжные близнецы платформы</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-black">
                Единомышленники твоего литературного вкуса
              </h3>
            </div>
            {casteName && (
              <span
                className={`self-start sm:self-auto text-xs px-3 py-1 rounded-full border font-medium ${
                  isDark
                    ? "bg-amber-500/10 border-amber-400/30 text-amber-300"
                    : "bg-amber-100 border-amber-300 text-amber-950"
                }`}
              >
                {casteName}
              </span>
            )}
          </div>

          {isTwinsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-36 rounded-2xl border ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-stone-200"
                  }`}
                />
              ))}
            </div>
          ) : twins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {twins.map((twin: ReadingDnaResponseData & { similarity: number }) => (
                <div
                  key={twin.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.02] shadow-sm ${
                    isDark
                      ? "bg-slate-900/70 border-slate-800 hover:border-amber-500/40"
                      : "bg-white border-stone-200 hover:border-amber-400"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        #{twin.ticketNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {twin.similarity}% совместимость
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-sm text-slate-100 truncate">
                      {twin.customName || "Анонимный странник"}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {twin.archetypeName}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <Link
                      to={`/reading-dna/duel?ticket=${twin.ticketNumber}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                    >
                      <Swords size={12} />
                      Дуэль
                    </Link>
                    <Link
                      to={`/reading-dna?ticket=${twin.ticketNumber}`}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Билет
                      <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`p-6 rounded-2xl border text-center space-y-2 ${
                isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-amber-50/50 border-amber-200/60"
              }`}
            >
              <Sparkles size={24} className="mx-auto text-amber-400 opacity-80" />
              <h4 className="font-serif font-bold text-sm">
                Ты один из первых в своей касте!
              </h4>
              <p className="text-xs opacity-75 max-w-md mx-auto">
                Поделись ссылкой на сравнение вкусов со своими читающими друзьями — когда они пройдут тест,
                вы мгновенно увидите ваше совпадение вкусов.
              </p>
            </div>
          )}
        </div>
      )}

      {/* СЕКЦИЯ 2: ИНТЕРАКТИВНАЯ ВИТРИНА BOOKSTRATA */}
      <div className="space-y-6">
        <div className="text-center sm:text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Sparkles size={14} />
            <span>Исследуй экосистему</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black">
            Что делать дальше на BookStrata?
          </h3>
          <p className="text-xs sm:text-sm opacity-70">
            {archetypeName ? (
              <>Твой читательский статус — <strong className="text-amber-400 font-medium">{archetypeName}</strong>. Открой для себя все грани книжного пространства платформы.</>
            ) : (
              "Погрузись в рейтинги, авторские полки и создавай свои интерактивные списки."
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platformCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm ${
                isDark
                  ? "bg-slate-900/50 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80"
                  : "bg-white border-stone-200 hover:border-amber-400 hover:bg-amber-50/30"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-3 rounded-xl border ${
                      isDark
                        ? "bg-slate-800/60 border-slate-700/60"
                        : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    {card.icon}
                  </div>
                  {card.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      {card.badge}
                    </span>
                  )}
                </div>

                <h4 className="font-serif font-bold text-base group-hover:text-amber-400 transition-colors">
                  {card.title}
                </h4>

                <p className="text-xs opacity-75 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-dashed border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                <span>{card.cta}</span>
                <ArrowUpRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
