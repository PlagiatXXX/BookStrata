import { useState } from "react";
import {
  Compass,
  Swords,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import type { DnaArchetypeCatalogItem } from "@/lib/readingDnaApi";

interface DnaIntroSectionProps {
  archetypes: DnaArchetypeCatalogItem[];
  theme: "dark" | "craft";
  onStartTest: () => void;
  onOpenDuel: () => void;
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
  onStartTest,
  onOpenDuel,
}: DnaIntroSectionProps) {
  const isDark = theme === "dark";
  const [selectedCaste, setSelectedCaste] = useState<"mind" | "abyss" | "action" | "light">("mind");

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
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide border uppercase bg-amber-500/15 border-amber-500/30 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
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
              isDark ? "text-amber-200/75" : "text-[#6f6553]"
            }`}
          >
            Расшифруйте свой литературный вкус по 6 осям, откройте свой архетип из 4 великих
            Орденов, получите персональный винтажный читательский билет и сравните читательские
            вкусы с друзьями.
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
              <div className="text-amber-500 font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="shrink-0" /> 6 дилемм вкуса
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/60" : "text-[#6f6553]"}`}>
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
              <div className="text-amber-500 font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="shrink-0" /> 16 редких архетипов
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/60" : "text-[#6f6553]"}`}>
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
              <div className="text-amber-500 font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="shrink-0" /> Сравнение вкусов
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/60" : "text-[#6f6553]"}`}>
                Сравнение радаров читательского вкуса, поиск книжных близнецов и вычисление криптонита
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onStartTest}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl text-xs sm:text-base font-semibold transition-all shadow-lg cursor-pointer bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass size={18} className="shrink-0" />
              <span>Начать тест (3 минуты)</span>
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
              isDark ? "text-amber-200/70" : "text-[#6f6553]"
            }`}
          >
            Без скучных школьных опросников. Только честные дилеммы вашего настоящего читательского опыта.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
          {/* Шаг 1 */}
          <div
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all hover:translate-y-[-2px] ${
              isDark
                ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 shadow-lg"
                : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] shadow-sm"
            }`}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold text-base sm:text-lg mb-3 sm:mb-4">
              1
            </div>
            <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">6 вопросов с дилеммами</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#6f6553]"}`}>
              Никаких правильных или неправильных ответов. Выбирайте то, что ближе вам: динамичный сюжет
              или медитативный слог, уютная романтика или леденящий психологический триллер.
            </p>
          </div>

          {/* Шаг 2 */}
          <div
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all hover:translate-y-[-2px] ${
              isDark
                ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 shadow-lg"
                : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] shadow-sm"
            }`}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold text-base sm:text-lg mb-3 sm:mb-4">
              2
            </div>
            <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">16 архетипов и билет</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#6f6553]"}`}>
              Алгоритм рассчитывает баланс 6 осей, распределяет вас в один из 4 великих Орденов и
              создаёт именной архивный читательский билет с уникальным номером и персональным литературным криптонитом.
            </p>
          </div>

          {/* Шаг 3 */}
          <div
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all hover:translate-y-[-2px] ${
              isDark
                ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100 shadow-lg"
                : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24] shadow-sm"
            }`}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold text-base sm:text-lg mb-3 sm:mb-4">
              3
            </div>
            <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">Сравнение вкусов</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#6f6553]"}`}>
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
              isDark ? "text-amber-200/70" : "text-[#6f6553]"
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
                <span className="font-bold text-xs sm:text-sm text-amber-500 uppercase tracking-wider">
                  Ось {i + 1}: {axis.title}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold mb-2">
                <span className="text-left text-amber-600 dark:text-amber-400">{axis.left}</span>
                <span className="text-xs opacity-40 px-1 sm:px-2">↔</span>
                <span className="text-right text-amber-600 dark:text-amber-400">{axis.right}</span>
              </div>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? "text-amber-200/70" : "text-[#6f6553]"}`}>
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
              isDark ? "text-amber-200/70" : "text-[#6f6553]"
            }`}
          >
            В какой Орден определит вас алгоритм? Нажмите на Орден, чтобы посмотреть его архетипы:
          </p>
        </div>

        {/* Переключатель орденов */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {CASTES_DATA.map((caste) => {
            const isSelected = selectedCaste === caste.id;
            return (
              <button
                key={caste.id}
                type="button"
                onClick={() => setSelectedCaste(caste.id)}
                className={`p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-amber-950/60 border-amber-500 text-amber-100 shadow-md shadow-amber-950/50 scale-[1.01]"
                      : "bg-[#f5ecdc] border-amber-600 text-[#2e2a24] shadow-sm scale-[1.01]"
                    : isDark
                    ? "bg-[#23170e]/60 border-amber-900/30 text-amber-200/60 hover:text-amber-200 hover:bg-amber-950/30"
                    : "bg-[#fffdf7] border-[#e2d5bc] text-[#6f6553] hover:text-[#2e2a24] hover:bg-[#faf4e8]"
                }`}
              >
                <div className="text-xs sm:text-sm font-bold leading-tight">{caste.name}</div>
                <div className="text-[10px] sm:text-[11px] opacity-75 mt-0.5 line-clamp-1">{caste.subtitle}</div>
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
                  : "bg-[#faf4e8] border-[#e2d5bc] text-[#6f6553]"
              }`}
            >
              <strong className="text-amber-500 font-semibold">{currentCaste.name}: </strong>
              {currentCaste.description}
            </div>
          );
        })()}

        {/* Сетка 4 архетипов выбранного ордена */}
        <div data-testid="archetypes-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredArchetypes.map((arch) => (
            <div
              key={arch.id}
              className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
                isDark
                  ? "bg-[#23170e]/80 border-amber-900/40 text-amber-100"
                  : "bg-[#fffdf7] border-[#d8c7a5] text-[#2e2a24]"
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-amber-500/15 mb-2">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-500">
                  №{arch.number}
                </span>
                <span className="text-[10px] sm:text-[11px] opacity-60">Редкость: {arch.rarity}/10</span>
              </div>

              <div className="text-sm sm:text-base font-bold text-amber-400 mb-1">
                {isDark ? arch.names.dark : arch.names.craft}
              </div>

              <p className={`text-xs leading-relaxed mb-2 sm:mb-3 ${isDark ? "text-amber-200/70" : "text-[#6f6553]"}`}>
                {arch.description}
              </p>

              {arch.quote && (
                <p className="text-[11px] sm:text-xs italic opacity-75 border-l-2 border-amber-500/40 pl-2 sm:pl-2.5 py-0.5">
                  «{arch.quote.replace(/^[«"“\s]+|[»"”\s]+$/g, "")}»
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── ДУЭЛЬ И КРИПТОНИТ ─── */}
      <section
        className={`p-4 sm:p-7 md:p-8 rounded-xl sm:rounded-2xl border text-left ${
          isDark
            ? "bg-gradient-to-br from-[#23170e] to-[#1c120b] border-amber-900/50 text-amber-100"
            : "bg-gradient-to-br from-[#fffdf7] to-[#f7f0e1] border-[#d8c7a5] text-[#2e2a24]"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
          <div className="md:col-span-8 space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Swords size={12} />
              Резонанс вкусов
            </div>
            <h2 className="text-lg sm:text-2xl font-bold">Сравнение читательских вкусов и криптонит</h2>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-amber-200/75" : "text-[#6f6553]"}`}>
              Хотите узнать, насколько совпадают ваши книжные ориентиры с другом или книжным блогером?
              Сравнение накладывает радары обоих читателей, вычисляет процент совпадения и активирует
              штраф за «криптонит» — книгу или жанр, который один обожает, а второй органически не переносит.
            </p>
          </div>
          <div className="md:col-span-4 flex justify-center md:justify-end pt-1 md:pt-0">
            <button
              type="button"
              onClick={onOpenDuel}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer border-amber-500/50 hover:bg-amber-500/10 text-amber-400 flex items-center justify-center gap-2"
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
          Готовы расшифровать свой Книжный ДНК?
        </h2>
        <p
          className={`text-xs sm:text-base max-w-xl mx-auto ${
            isDark ? "text-amber-200/70" : "text-[#6f6553]"
          }`}
        >
          Всего 6 вопросов отделяют вас от персонального билета и посвящения в Орден.
        </p>
        <div className="pt-1 sm:pt-2">
          <button
            type="button"
            onClick={onStartTest}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold transition-all shadow-xl cursor-pointer bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Compass size={18} className="shrink-0" />
            <span>Пройти тест прямо сейчас</span>
            <ArrowRight size={18} className="shrink-0" />
          </button>
        </div>
      </section>
    </div>
  );
}
