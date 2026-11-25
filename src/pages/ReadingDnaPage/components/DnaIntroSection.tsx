import { useState } from "react";
import {
  Compass,
  Swords,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Lock,
  Ticket,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { DnaArchetypeCatalogItem, ReadingDnaResponseData } from "@/lib/readingDnaApi";
import { findArchetypeByIdOrName } from "../domain/dnaArchetypeMatch";

interface DnaIntroSectionProps {
  archetypes: DnaArchetypeCatalogItem[];
  theme: "dark" | "craft";
  userTicket?: ReadingDnaResponseData | null;
  onStartTest: () => void;
  onOpenDuel: () => void;
  onGoToTicket?: () => void;
}

const AXIS_PREVIEWS = [
  {
    title: "Фокус",
    left: "Динамичный сюжет",
    right: "Густая атмосфера",
    desc: "Что для вас на первом месте — стремительное действие и интрига или медленное погружение в мир и язык автора?",
  },
  {
    title: "Эмоциональный вес",
    left: "Легкий отдых",
    right: "Глубокий катарсис",
    desc: "Книга как расслабляющее убежище или как эмоциональный шторм, выворачивающий душу наизнанку?",
  },
  {
    title: "Темп",
    left: "Стремительный драйв",
    right: "Вдумчивая медитация",
    desc: "Чтение взахлёб за одну ночь или медленное смакование каждого абзаца с паузами на размышления?",
  },
  {
    title: "Мрак",
    left: "Солнечный уют",
    right: "Тёмная бездна",
    desc: "Жизнеутверждающие добрые истории или исследование человеческих пороков, трагедии и нуара?",
  },
  {
    title: "Масштаб",
    left: "Камерная драма",
    right: "Грандиозная эпопея",
    desc: "История одной комнаты и двух сердец или масштабные хроники с десятками персонажей и сотнями лет истории?",
  },
  {
    title: "Сложность",
    left: "Ясная простота",
    right: "Интеллектуальный лабиринт",
    desc: "Прямой, честный сюжет без претензий или многослойный модернизм с ненадежными рассказчиками?",
  },
];

const CASTES_DATA = [
  {
    id: "mind" as const,
    name: "Орден Смыслов",
    subtitle: "Интеллект, слог и философия",
    badge: "border-slate-400/40 text-slate-300 bg-slate-500/10",
    color: "#94a3b8",
    description: "Читатели, которые ищут в книгах архитектуру идей, сложный модернизм, эссеистику и препарирование реальности.",
  },
  {
    id: "abyss" as const,
    name: "Орден Бездны",
    subtitle: "Тьма, психологизм и катарсис",
    badge: "border-rose-400/40 text-rose-300 bg-rose-500/10",
    color: "#f43f5e",
    description: "Исследователи тёмной стороны человеческой природы, психологического нуара, экзистенциализма и контркультуры.",
  },
  {
    id: "action" as const,
    name: "Орден Действия",
    subtitle: "Сюжет, динамика и миры",
    badge: "border-amber-400/40 text-amber-300 bg-amber-500/10",
    color: "#f59e0b",
    description: "Искатели драйва, изобретательных детективных лабиринтов, эпического фэнтези и космических масштабов.",
  },
  {
    id: "light" as const,
    name: "Орден Света",
    subtitle: "Уют, надежда и магия",
    badge: "border-yellow-400/40 text-yellow-300 bg-yellow-500/10",
    color: "#eab308",
    description: "Хранители читательского тепла, ламповых миров, искренней романтики и чувства чуда под одеялом с фонариком.",
  },
];

export function DnaIntroSection({
  archetypes,
  theme,
  userTicket,
  onStartTest,
  onOpenDuel,
  onGoToTicket,
}: DnaIntroSectionProps) {
  const isDark = theme === "dark";
  const userArchetype = userTicket
    ? findArchetypeByIdOrName(archetypes, userTicket.archetype)
    : undefined;

  const [userSelectedCaste, setUserSelectedCaste] = useState<
    "mind" | "abyss" | "action" | "light" | null
  >(null);
  const selectedCaste = userSelectedCaste ?? userArchetype?.caste?.id ?? "mind";

  const hasTicket = Boolean(userTicket);

  // Фильтрация архетипов по выбранному ордену
  const filteredArchetypes = archetypes.filter((a) => a.caste?.id === selectedCaste);

  return (
    <div className="w-full space-y-8 sm:space-y-12">
      {/* ─── HERO БЛОК ─── */}
      <section
        className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-4 sm:p-7 md:p-10 transition-all ${
          isDark
            ? "bg-[#18110b]/70 border-amber-900/40 shadow-xl shadow-black/40"
            : "bg-[#faf6ee] border-[#d8c7a5] shadow-md shadow-amber-950/5"
        }`}
      >
        {/* Декоративный фоновый узор */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(ellipse at 50% -20%, rgba(217, 119, 6, 0.25), transparent 70%)"
              : "radial-gradient(ellipse at 50% -20%, rgba(59, 110, 168, 0.15), transparent 70%)",
          }}
        />

        <div className="relative z-10 w-full space-y-4 sm:space-y-6 text-left">
          {/* Бейдж без эмодзи */}
          <div
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide border uppercase ${
              isDark
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-amber-100 border-amber-300 text-amber-900"
            }`}
          >
            <span
              data-decoration-pulse=""
              className={`w-1.5 h-1.5 rounded-full ${
                isDark ? "bg-amber-400" : "bg-amber-700"
              }`}
            />
            Интерактивный спецпроект BookStrata
          </div>

          <h1
            className={`text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight ${
              isDark ? "text-amber-100" : "text-[#2e2a24]"
            }`}
          >
            Книжный ДНК: узнайте, какой вы читатель
          </h1>

          <p
            className={`text-xs sm:text-base md:text-lg leading-relaxed ${
              isDark ? "text-amber-200/75" : "text-[#423d33]"
            }`}
          >
            Расшифруйте свой литературный вкус по 6 осям, откройте свой архетип из 4 великих
            Орденов, получите персональный винтажный читательский билет и сравните читательские
            вкусы с друзьями. Хотите узнать, какой вы читатель? Пройдите тест «Какой я читатель» —
            и получите свой читательский ДНК.
          </p>

          {/* Информационные плашки фич */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
            <div
              className={`p-3 sm:p-3.5 rounded-lg sm:rounded-xl border ${
                isDark
                  ? "bg-[#23170e]/70 border-amber-900/30 text-amber-100"
                  : "bg-white/80 border-[#d8c7a5]/60 text-[#2e2a24]"
              }`}
            >
              <div
                className={`font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5 ${
                  isDark ? "text-amber-400" : "text-amber-800"
                }`}
              >
                <CheckCircle2 size={15} className="shrink-0" /> 6 дилемм вкуса
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/60" : "text-[#423d33]"}`}>
                Никаких скучных тестов: честные дилеммы вашего настоящего опыта чтения
              </p>
            </div>

            <div
              className={`p-3 sm:p-3.5 rounded-lg sm:rounded-xl border ${
                isDark
                  ? "bg-[#23170e]/70 border-amber-900/30 text-amber-100"
                  : "bg-white/80 border-[#d8c7a5]/60 text-[#2e2a24]"
              }`}
            >
              <div
                className={`font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5 ${
                  isDark ? "text-amber-400" : "text-amber-800"
                }`}
              >
                <CheckCircle2 size={15} className="shrink-0" /> 16 редких архетипов
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/60" : "text-[#423d33]"}`}>
                4 великих Ордена с распределением по канонической матрице предпочтений
              </p>
            </div>

            <div
              className={`p-3 sm:p-3.5 rounded-lg sm:rounded-xl border ${
                isDark
                  ? "bg-[#23170e]/70 border-amber-900/30 text-amber-100"
                  : "bg-white/80 border-[#d8c7a5]/60 text-[#2e2a24]"
              }`}
            >
              <div
                className={`font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5 ${
                  isDark ? "text-amber-400" : "text-amber-800"
                }`}
              >
                <CheckCircle2 size={15} className="shrink-0" /> Сравнение вкусов
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/60" : "text-[#423d33]"}`}>
                Сравнение радаров читательского вкуса, поиск книжных близнецов и вычисление криптонита
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          {hasTicket ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onGoToTicket ?? onStartTest}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl text-xs sm:text-base font-semibold transition-all shadow-lg cursor-pointer bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Ticket size={18} className="shrink-0" />
                <span>Мой билет №{userTicket?.ticketNumber}</span>
                <ArrowRight size={18} className="shrink-0" />
              </button>

              <button
                type="button"
                onClick={onOpenDuel}
                className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-xs sm:text-base font-medium transition-colors border cursor-pointer ${
                  isDark
                    ? "border-amber-900/50 hover:bg-amber-950/40 text-amber-200"
                    : "border-[#d8c7a5] hover:bg-[#f4ebe1] text-[#2e2a24]"
                }`}
              >
                <Swords size={18} className="shrink-0" />
                <span>Сравнить по номеру билета</span>
              </button>

              <button
                type="button"
                onClick={onStartTest}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-3 sm:py-3.5 rounded-xl text-xs font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer ${
                  isDark ? "text-amber-300" : "text-amber-900"
                }`}
                title="Пройти опросник заново и обновить свой читательский профиль"
              >
                <RotateCcw size={14} className="shrink-0" />
                <span>Пройти заново</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onStartTest}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl text-xs sm:text-base font-semibold transition-all shadow-lg cursor-pointer bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Compass size={18} className="shrink-0" />
                <span>Начать тест (2 минуты)</span>
                <ArrowRight size={18} className="shrink-0" />
              </button>

              <button
                type="button"
                onClick={onOpenDuel}
                className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-xs sm:text-base font-medium transition-colors border cursor-pointer ${
                  isDark
                    ? "border-amber-900/50 hover:bg-amber-950/40 text-amber-200"
                    : "border-[#d8c7a5] hover:bg-[#f4ebe1] text-[#2e2a24]"
                }`}
              >
                <Swords size={18} className="shrink-0" />
                <span>Сравнить по номеру билета</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── 3 ПРОСТЫХ ШАГА ─── */}
      <section className="space-y-4 sm:space-y-6 text-left">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h2
            className={`text-lg sm:text-2xl md:text-3xl font-bold ${
              isDark ? "text-amber-100" : "text-[#2e2a24]"
            }`}
          >
            Как это работает: 3 простых шага
          </h2>
          <p
            className={`text-xs sm:text-base max-w-2xl mx-auto ${
              isDark ? "text-amber-200/70" : "text-[#423d33]"
            }`}
          >
            Без скучных школьных опросников. Только честные дилеммы вашего настоящего читательского опыта.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
          {/* Шаг 1 */}
          <div
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all hover:-translate-y-0.5 ${
              isDark
                ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 shadow-lg"
                : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] shadow-sm"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg mb-3 sm:mb-4 border ${
                isDark
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-amber-100 border-amber-300 text-amber-900"
              }`}
            >
              1
            </div>
            <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">6 вопросов с дилеммами</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#423d33]"}`}>
              Никаких правильных или неправильных ответов. Выбирайте то, что ближе вам: динамичный сюжет
              или медитативный слог, уютная романтика или леденящий психологический триллер.
            </p>
          </div>

          {/* Шаг 2 */}
          <div
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all hover:-translate-y-0.5 ${
              isDark
                ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 shadow-lg"
                : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] shadow-sm"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg mb-3 sm:mb-4 border ${
                isDark
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-amber-100 border-amber-300 text-amber-900"
              }`}
            >
              2
            </div>
            <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">16 архетипов и билет</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#423d33]"}`}>
              Алгоритм рассчитывает баланс 6 осей, распределяет вас в один из 4 великих Орденов и
              создаёт именной архивный читательский билет с уникальным номером и персональным литературным криптонитом.
            </p>
          </div>

          {/* Шаг 3 */}
          <div
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all hover:-translate-y-0.5 ${
              isDark
                ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 shadow-lg"
                : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] shadow-sm"
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg mb-3 sm:mb-4 border ${
                isDark
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-amber-100 border-amber-300 text-amber-900"
              }`}
            >
              3
            </div>
            <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">Сравнение вкусов</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#423d33]"}`}>
              Отправьте ссылку другу или введите его номер билета: система наложит ваши радары,
              рассчитает процент совместимости и проверит литературный криптонит.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 6 ОСЕЙ ЛИТЕРАТУРНОГО ВКУСА ─── */}
      <section className="space-y-4 sm:space-y-6 text-left">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h2
            className={`text-lg sm:text-2xl md:text-3xl font-bold ${
              isDark ? "text-amber-100" : "text-[#2e2a24]"
            }`}
          >
            6 осей читательского вкуса
          </h2>
          <p
            className={`text-xs sm:text-base max-w-2xl mx-auto ${
              isDark ? "text-amber-200/70" : "text-[#423d33]"
            }`}
          >
            Каждый читатель уникален. Ваш Книжный ДНК раскладывается на 6 ключевых координат.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {AXIS_PREVIEWS.map((axis, i) => (
            <div
              key={i}
              className={`p-3.5 sm:p-5 rounded-xl border ${
                isDark
                  ? "bg-[#23170e]/60 border-amber-900/30 text-amber-100"
                  : "bg-[#fffdf7] border-[#e2d5bc] text-[#2e2a24]"
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-amber-500/15 mb-2 sm:mb-3">
                <span
                  className={`font-bold text-xs sm:text-sm uppercase tracking-wider ${
                    isDark ? "text-amber-400" : "text-amber-800"
                  }`}
                >
                  Ось {i + 1}: {axis.title}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold mb-2">
                <span className={`text-left font-semibold ${isDark ? "text-amber-300" : "text-amber-900"}`}>
                  {axis.left}
                </span>
                <span className={`text-xs px-1 sm:px-2 ${isDark ? "text-amber-400/50" : "text-amber-900/40"}`}>
                  ↔
                </span>
                <span className={`text-right font-semibold ${isDark ? "text-amber-300" : "text-amber-900"}`}>
                  {axis.right}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#423d33]"}`}>
                {axis.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4 ВЕЛИКИХ ОРДЕНА И 16 АРХЕТИПОВ ─── */}
      <section className="space-y-4 sm:space-y-6 text-left">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h2
            className={`text-lg sm:text-2xl md:text-3xl font-bold ${
              isDark ? "text-amber-100" : "text-[#2e2a24]"
            }`}
          >
            4 Великих Ордена и 16 Архетипов
          </h2>
          <p
            className={`text-xs sm:text-base max-w-2xl mx-auto ${
              isDark ? "text-amber-200/70" : "text-[#423d33]"
            }`}
          >
            {hasTicket ? (
              <>
                16 читательских архетипов. Печать снята вашим читательским билетом{" "}
                <span className="font-mono font-bold text-amber-400">№{userTicket?.ticketNumber}</span>
                {userArchetype?.caste?.name ? (
                  <> · ваш подтверждённый Орден: <strong className={isDark ? "text-amber-300" : "text-amber-900"}>{userArchetype.caste.name}</strong></>
                ) : null}
                .
              </>
            ) : (
              "16 читательских архетипов со своей шкалой редкости. Описания запечатаны — определите свой Орден и снимите печать с личного билета:"
            )}
          </p>
        </div>

        {/* Переключатель орденов */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {CASTES_DATA.map((caste) => {
            const isSelected = selectedCaste === caste.id;
            const isUserCaste = userArchetype?.caste?.id === caste.id;
            return (
              <button
                key={caste.id}
                type="button"
                onClick={() => setUserSelectedCaste(caste.id)}
                className={`p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border text-center transition-all cursor-pointer relative ${
                  isSelected
                    ? isDark
                      ? "bg-amber-950/60 border-amber-500 text-amber-100 shadow-md shadow-amber-950/50 scale-[1.01]"
                      : "bg-[#f5ecdc] border-amber-700 text-[#2e2a24] shadow-sm scale-[1.01]"
                    : isDark
                    ? "bg-[#23170e]/60 border-amber-900/30 text-amber-200/75 hover:text-amber-100 hover:bg-amber-950/30"
                    : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] hover:bg-[#faf4e8]"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div className="text-xs sm:text-sm font-bold leading-tight">{caste.name}</div>
                  {isUserCaste && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Ваш орден" />
                  )}
                </div>
                <div
                  className={`text-[10px] sm:text-[11px] mt-0.5 line-clamp-1 ${
                    isSelected
                      ? isDark
                        ? "text-amber-200/85"
                        : "text-[#4a4235]"
                      : isDark
                      ? "text-amber-200/65"
                      : "text-[#574f42]"
                  }`}
                >
                  {caste.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Описание выбранного ордена */}
        {(() => {
          const currentCaste = CASTES_DATA.find((c) => c.id === selectedCaste);
          if (!currentCaste) return null;
          return (
            <div
              className={`p-3 sm:p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                isDark
                  ? "bg-amber-950/20 border-amber-900/40 text-amber-200/80"
                  : "bg-[#faf4e8] border-[#e2d5bc] text-[#3d3830]"
              }`}
            >
              <strong className={`font-bold ${isDark ? "text-amber-400" : "text-amber-900"}`}>{currentCaste.name}: </strong>
              {currentCaste.description}
            </div>
          );
        })()}

        {/* Сетка 4 архетипов выбранного ордена */}
        <div data-testid="archetypes-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredArchetypes.map((arch) => {
            const isUserArchetype = Boolean(
              userTicket &&
              (arch.id === userArchetype?.id ||
               arch.id.toLowerCase() === userTicket.archetype?.toLowerCase())
            );
            const isCardSealed = !hasTicket;

            const handleCardClick = () => {
              if (isCardSealed) {
                onStartTest();
              } else if (isUserArchetype && onGoToTicket) {
                onGoToTicket();
              }
            };

            return (
              <div
                key={arch.id}
                onClick={handleCardClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                className={`group relative p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer overflow-hidden text-left flex flex-col justify-between ${
                  isUserArchetype
                    ? isDark
                      ? "bg-[#281b11] border-amber-500 ring-2 ring-amber-500/40 text-amber-100 shadow-lg shadow-amber-950/50"
                      : "bg-[#fffcf2] border-amber-700 ring-2 ring-amber-700/30 text-[#2e2a24] shadow-md shadow-amber-950/15"
                    : isDark
                    ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-950/40"
                    : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] hover:border-amber-700/60 hover:shadow-md hover:shadow-amber-950/10"
                }`}
              >
                {/* Шапка карточки — открыта (номер, редкость, название) */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-amber-500/15 mb-2">
                    <span
                      className={`text-[10px] sm:text-xs font-mono font-bold ${
                        isDark ? "text-amber-400" : "text-amber-800"
                      }`}
                    >
                      №{arch.number}
                    </span>
                    <span
                      className={`text-[10px] sm:text-[11px] font-medium ${
                        isDark ? "text-amber-200/75" : "text-[#574f42]"
                      }`}
                    >
                      Редкость: {arch.rarity}/10
                    </span>
                  </div>

                  {isUserArchetype && (
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide uppercase border mb-1.5 ${
                        isDark
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-amber-100 border-amber-700/40 text-amber-900"
                      }`}
                    >
                      <Sparkles size={11} className="text-amber-400 shrink-0" />
                      <span>Ваш архетип</span>
                    </div>
                  )}

                  <div
                    className={`text-sm sm:text-base font-bold mb-3 transition-colors ${
                      isDark ? "text-amber-300 group-hover:text-amber-200" : "text-amber-900 group-hover:text-amber-950"
                    }`}
                  >
                    {isDark ? arch.names.dark : arch.names.craft}
                  </div>
                </div>

                {/* Тело карточки — запечатано туманом архива только для новичков без билета */}
                <div className="relative mt-1 min-h-30 sm:min-h-33.75 flex items-center justify-center">
                  {isCardSealed ? (
                    <>
                      {/* Размытый текст для поисковых систем и скринридеров */}
                      <div
                        className="select-none filter blur-[4.5px] opacity-35 transition-all group-hover:opacity-45 pointer-events-none space-y-2 w-full"
                        aria-hidden="true"
                      >
                        <p className={`text-xs leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#423d33]"}`}>
                          {arch.description}
                        </p>
                        {arch.quote && (
                          <p
                            className={`text-[11px] sm:text-xs italic border-l-2 pl-2 py-0.5 line-clamp-2 ${
                              isDark
                                ? "border-amber-500/40 text-amber-200/80"
                                : "border-amber-600/50 text-[#423d33]"
                            }`}
                          >
                            «{arch.quote.replace(/^[«"“\s]+|[»"”\s]+$/g, "")}»
                          </p>
                        )}
                      </div>

                      {/* Сургучная печать поверх текста */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                        <div
                          className={`px-3 py-2 rounded-xl border backdrop-blur-xs shadow-sm flex flex-col items-center gap-1 transition-transform group-hover:scale-105 ${
                            isDark
                              ? "bg-[#160e09]/85 border-amber-500/30 text-amber-200"
                              : "bg-[#fbf7ee]/90 border-amber-800/25 text-[#3a342a]"
                          }`}
                        >
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400">
                            <Lock size={12} className={isDark ? "text-amber-400" : "text-amber-700"} />
                            <span>Запечатано</span>
                          </div>
                          <span className="text-[10px] leading-tight opacity-75">
                            Пройдите тест, чтобы снять печать
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Печать снята читательским билетом: ясный, красивый текст и цитата */
                    <div className="space-y-2 w-full text-left self-start py-0.5">
                      <p className={`text-xs leading-relaxed ${isDark ? "text-amber-200/80" : "text-[#423d33]"}`}>
                        {arch.description}
                      </p>
                      {arch.quote && (
                        <p
                          className={`text-[11px] sm:text-xs italic border-l-2 pl-2.5 py-0.5 ${
                            isDark
                              ? "border-amber-500/50 text-amber-300/90"
                              : "border-amber-700/60 text-amber-950/90"
                          }`}
                        >
                          «{arch.quote.replace(/^[«"“\s]+|[»"”\s]+$/g, "")}»
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Кнопка-призыв под сеткой */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {hasTicket ? (
            <>
              <button
                type="button"
                onClick={onGoToTicket ?? onStartTest}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer ${
                  isDark
                    ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40"
                    : "bg-amber-900/10 text-amber-900 hover:bg-amber-900/20 border border-amber-900/25"
                }`}
              >
                <Ticket size={15} />
                <span>Открыть мой билет №{userTicket?.ticketNumber}</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={onStartTest}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer ${
                  isDark ? "text-amber-300" : "text-amber-900"
                }`}
              >
                <RotateCcw size={13} />
                <span>Перепройти тест</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartTest}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer ${
                isDark
                  ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40"
                  : "bg-amber-900/10 text-amber-900 hover:bg-amber-900/20 border border-amber-900/25"
              }`}
            >
              <span>Узнать свой орден и снять печать</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Полный справочник всех 16 архетипов для быстрого обзора и индексации */}
        {archetypes.length > 0 && (
          <details
            className={`rounded-xl border p-3.5 sm:p-4 text-xs transition-colors ${
              isDark
                ? "bg-[#23170e]/50 border-amber-900/35 text-amber-100"
                : "bg-[#faf6ee] border-[#d8c7a5] text-[#2e2a24]"
            }`}
          >
            <summary className="cursor-pointer font-semibold select-none flex items-center justify-between gap-2">
              <span>Полный реестр всех {archetypes.length} читательских архетипов по 4 Орденам</span>
              <span className="opacity-65 text-[11px]">Показать список ▾</span>
            </summary>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {archetypes.map((arch) => (
                <li
                  key={arch.id}
                  className={`p-2.5 rounded-lg border ${
                    isDark
                      ? "bg-[#1a110c]/60 border-amber-900/30"
                      : "bg-white/80 border-[#e2d5bc]"
                  }`}
                >
                  <div className="font-bold">
                    №{arch.number} · {isDark ? arch.names.dark : arch.names.craft}{" "}
                    <span className="font-normal opacity-70">({arch.caste.name})</span>
                  </div>
                  {hasTicket && (
                    <p className="opacity-80 mt-1 leading-relaxed">{arch.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ─── ДУЭЛЬ И КРИПТОНИТ ─── */}
      <section
        className={`p-4 sm:p-7 md:p-8 rounded-xl sm:rounded-2xl border text-left ${
          isDark
            ? "bg-linear-to-br from-[#23170e] to-[#1c120b] border-amber-900/50 text-amber-100"
            : "bg-linear-to-br from-[#fffdf7] to-[#f7f0e1] border-[#d8c7a5] text-[#2e2a24]"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
          <div className="md:col-span-8 space-y-2 sm:space-y-3">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider border ${
                isDark
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-rose-100 text-rose-900 border-rose-300"
              }`}
            >
              <Swords size={12} />
              Резонанс вкусов
            </div>
            <h2 className="text-lg sm:text-2xl font-bold">Сравнение читательских вкусов и криптонит</h2>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/75" : "text-[#423d33]"}`}>
              Хотите узнать, насколько совпадают ваши книжные ориентиры с другом или книжным блогером?
              Сравнение накладывает радары обоих читателей, вычисляет процент совпадения и активирует
              штраф за «криптонит» — книгу или жанр, который один обожает, а второй органически не переносит.
            </p>
          </div>
          <div className="md:col-span-4 flex justify-center md:justify-end pt-1 md:pt-0">
            <button
              type="button"
              onClick={onOpenDuel}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer flex items-center justify-center gap-2 ${
                isDark
                  ? "border-amber-500/50 hover:bg-amber-500/10 text-amber-400"
                  : "border-amber-700/80 hover:bg-amber-100/60 text-amber-900 font-semibold"
              }`}
            >
              <Swords size={16} />
              <span>Сравнить читательские вкусы</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── ФИНАЛЬНЫЙ CTA-БЛОК ─── */}
      <section className="text-center py-4 sm:py-6 space-y-3 sm:space-y-4">
        <h2
          className={`text-xl sm:text-3xl font-bold ${
            isDark ? "text-amber-100" : "text-[#2e2a24]"
          }`}
        >
          {hasTicket
            ? "Ваш Книжный ДНК уже расшифрован"
            : "Готовы расшифровать свой Книжный ДНК?"}
        </h2>
        <p
          className={`text-xs sm:text-base max-w-xl mx-auto ${
            isDark ? "text-amber-200/70" : "text-[#423d33]"
          }`}
        >
          {hasTicket ? (
            <>
              Ваш читательский билет активен. Сравните вкус с друзьями или обсудите свои книги с Букстражем.
            </>
          ) : (
            "Всего 6 вопросов отделяют вас от персонального билета и посвящения в Орден."
          )}
        </p>
        <div className="pt-1 sm:pt-2 flex flex-wrap items-center justify-center gap-3">
          {hasTicket ? (
            <>
              <button
                type="button"
                onClick={onGoToTicket ?? onStartTest}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold transition-all shadow-xl cursor-pointer bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Ticket size={18} className="shrink-0" />
                <span>Открыть мой билет</span>
                <ArrowRight size={18} className="shrink-0" />
              </button>
              <button
                type="button"
                onClick={onOpenDuel}
                className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-medium transition-colors border cursor-pointer ${
                  isDark
                    ? "border-amber-900/50 hover:bg-amber-950/40 text-amber-200"
                    : "border-[#d8c7a5] hover:bg-[#f4ebe1] text-[#2e2a24]"
                }`}
              >
                <Swords size={18} className="shrink-0" />
                <span>Сравнить читательские вкусы</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartTest}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold transition-all shadow-xl cursor-pointer bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass size={18} className="shrink-0" />
              <span>Пройти тест прямо сейчас</span>
              <ArrowRight size={18} className="shrink-0" />
            </button>
          )}
        </div>
      </section>

      {/* ─── ЧАСТЫЕ ВОПРОСЫ ─── */}
      <section className="space-y-4 sm:space-y-6 text-left">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h2
            className={`text-lg sm:text-2xl md:text-3xl font-bold ${
              isDark ? "text-amber-100" : "text-[#2e2a24]"
            }`}
          >
            Частые вопросы
          </h2>
          <p
            className={`text-xs sm:text-base max-w-2xl mx-auto ${
              isDark ? "text-amber-200/70" : "text-[#423d33]"
            }`}
          >
            Ответы на самые популярные вопросы о Книжном ДНК и читательском билете.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {[
            {
              q: "Какой я читатель?",
              a: "Пройдите интерактивный тест из 6 вопросов с дилеммами — и алгоритм расшифрует ваш читательский ДНК по 6 осям, определит архетип из 16 и выдаст персональный читательский билет с уникальным номером.",
            },
            {
              q: "Что такое книжный ДНК?",
              a: "Книжный ДНК — это ваш литературный профиль: баланс 6 осей читательского вкуса (сюжет vs атмосфера, лёгкость vs глубина, темп, мрак, масштаб, сложность), архетип из 4 Орденов и персональный литературный криптонит.",
            },
            {
              q: "Что такое читательский билет?",
              a: "Это персональная карточка с вашим архетипом, номером билета и расшифровкой вкуса. Билет можно скачать, поделиться ссылкой и сравнить с друзьями.",
            },
            {
              q: "Как сравнить читательские вкусы с друзьями?",
              a: "Введите номер билета друга или отправьте ему ссылку для сравнения — система наложит ваши радары, рассчитает процент совместимости и проверит литературный криптонит.",
            },
            {
              q: "Что такое литературный криптонит?",
              a: "Книга или жанр, который вы терпеть не можете. Криптонит показывает, какие книги вам точно не стоит рекомендовать.",
            },
            {
              q: "Сколько вопросов в тесте?",
              a: "Всего 6 вопросов с дилеммами. Никаких правильных или неправильных ответов — только честный выбор.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className={`group rounded-xl border p-4 sm:p-5 transition-colors ${
                isDark
                  ? "bg-[#23170e]/60 border-amber-900/30 text-amber-100"
                  : "bg-[#fffdf7] border-[#e2d5bc] text-[#2e2a24]"
              }`}
            >
              <summary
                className={`cursor-pointer font-bold text-sm sm:text-base list-none flex items-center justify-between gap-2 ${
                  isDark ? "text-amber-100" : "text-[#2e2a24]"
                }`}
              >
                <span>{item.q}</span>
                <span
                  className={`shrink-0 transition-transform group-open:rotate-180 ${
                    isDark ? "text-amber-400" : "text-amber-800"
                  }`}
                >
                  ▾
                </span>
              </summary>
              <p
                className={`mt-3 text-xs sm:text-sm leading-relaxed ${
                  isDark ? "text-amber-200/75" : "text-[#423d33]"
                }`}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <p
          className={`text-center text-xs sm:text-sm mt-4 ${
            isDark ? "text-amber-200/60" : "text-[#423d33]"
          }`}
        >
          Хотите узнать подробнее? Читайте статьи{" "}
          <a
            href="/blog/kakoy-ya-chitatel"
            className={`underline underline-offset-2 ${
              isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-800 hover:text-amber-700"
            }`}
          >
            «Какой я читатель: тест на читательский ДНК»
          </a>{" "}
          и{" "}
          <a
            href="/blog/matematika-chitatelskogo-dnk"
            className={`underline underline-offset-2 ${
              isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-800 hover:text-amber-700"
            }`}
          >
            «Математика читательского ДНК»
          </a>
          .
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: "Книжный ДНК: тест «Какой я читатель»",
            description:
              "Интерактивный тест из 6 вопросов с дилеммами, который расшифровывает ваш читательский ДНК по 6 осям, определяет архетип из 16 и выдаёт персональный читательский билет.",
            about: { "@type": "Thing", name: "Читательский вкус и литературный профиль" },
            numberOfQuestions: 6,
            educationalUse: "self-assessment",
            inLanguage: "ru",
            hasPart: [
              {
                "@type": "Question",
                name: "Что вам нравится в книге: сюжет или рефлексия?",
                acceptedAnswer: { "@type": "Answer", text: "Калибровка от стремительного сюжета и интриг до глубокого психологизма и философии." },
              },
              {
                "@type": "Question",
                name: "Сколько усилий вы готовы вложить в чтение: легко или тяжело?",
                acceptedAnswer: { "@type": "Answer", text: "Выбор между лёгким отдыхом на вечер и сложным катарсисом." },
              },
              {
                "@type": "Question",
                name: "Как вы предпочитаете читать: быстро или с погружением?",
                acceptedAnswer: { "@type": "Answer", text: "Предпочитаемый темп: по книге за ночь или медленное смакование текста." },
              },
              {
                "@type": "Question",
                name: "Какое настроение вам ближе: светло или мрачно?",
                acceptedAnswer: { "@type": "Answer", text: "Баланс между тёплым уютом и психологическим саспенсом или нуаром." },
              },
              {
                "@type": "Question",
                name: "Какого масштаба история вам нужна: камерное или эпическое?",
                acceptedAnswer: { "@type": "Answer", text: "Камерная драма в одной комнате или грандиозные миры и эпохи." },
              },
              {
                "@type": "Question",
                name: "Любите разгадывать книгу: доступное или многослойное?",
                acceptedAnswer: { "@type": "Answer", text: "Ясное линейное повествование или модернистские шифры и подтексты." },
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Какой я читатель?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Пройдите интерактивный тест из 6 вопросов с дилеммами — и алгоритм расшифрует ваш читательский ДНК по 6 осям, определит архетип из 16 и выдаст персональный читательский билет с уникальным номером.",
                },
              },
              {
                "@type": "Question",
                name: "Что такое книжный ДНК?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Книжный ДНК — это ваш литературный профиль: баланс 6 осей читательского вкуса (сюжет vs атмосфера, лёгкость vs глубина, темп, мрак, масштаб, сложность), архетип из 4 Орденов и персональный литературный криптонит.",
                },
              },
              {
                "@type": "Question",
                name: "Что такое читательский билет?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Это персональная карточка с вашим архетипом, номером билета и расшифровкой вкуса. Билет можно скачать, поделиться ссылкой и сравнить с друзьями.",
                },
              },
              {
                "@type": "Question",
                name: "Как сравнить читательские вкусы с друзьями?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Введите номер билета друга или отправьте ему ссылку для сравнения — система наложит ваши радары, рассчитает процент совместимости и проверит литературный криптонит.",
                },
              },
              {
                "@type": "Question",
                name: "Что такое литературный криптонит?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Книга или жанр, который вы терпеть не можете. Криптонит показывает, какие книги вам точно не стоит рекомендовать.",
                },
              },
              {
                "@type": "Question",
                name: "Сколько вопросов в тесте?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Всего 6 вопросов с дилеммами. Никаких правильных или неправильных ответов — только честный выбор.",
                },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
