import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Skull,
  Compass,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { CreativeSlider } from "./CreativeSlider";
import type { ReadingDnaInputData, DnaBookItemData, DnaAxesData } from "@/lib/readingDnaApi";

export interface DnaStepFlowProps {
  onComplete: (data: ReadingDnaInputData) => void;
  isLoading?: boolean;
  theme?: "dark" | "craft";
  initialName?: string;
}

const POPULAR_GENRES = [
  "Классика",
  "Фантастика",
  "Фэнтези",
  "Детектив и триллер",
  "Психологическая проза",
  "Философия",
  "Антиутопия",
  "Ужасы и мистика",
  "Любовный роман",
  "Исторический роман",
  "Нон-фикшн",
  "Поэзия",
];

export function DnaStepFlow({
  onComplete,
  isLoading = false,
  theme = "dark",
  initialName = "",
}: DnaStepFlowProps) {
  const isDark = theme === "dark";
  const [step, setStep] = useState(0);

  // Состояние 3 книг
  const [favoriteBooks, setFavoriteBooks] = useState<DnaBookItemData[]>([
    { title: "", author: "" },
    { title: "", author: "" },
    { title: "", author: "" },
  ]);

  // Состояние криптонита
  const [kryptonite, setKryptonite] = useState<DnaBookItemData>({
    title: "",
    author: "",
  });
  const [noKryptonite, setNoKryptonite] = useState(false);

  // Жанры
  const [likedGenres, setLikedGenres] = useState<string[]>([]);
  const [dislikedGenres, setDislikedGenres] = useState<string[]>([]);

  // 6 осей восприятия
  const [axes, setAxes] = useState<DnaAxesData>({
    storyFocus: 50,
    emotionalWeight: 50,
    pace: 50,
    darkness: 50,
    scope: 50,
    complexity: 50,
  });

  // Имя и тема билета
  const [customName, setCustomName] = useState(initialName);
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "craft">(theme);

  // Валидация шагов
  const isStep0Valid = favoriteBooks.every((b) => b.title.trim().length > 0);
  const isStep1Valid = noKryptonite || kryptonite.title.trim().length > 0;
  const isStep2Valid = likedGenres.length > 0;

  const handleBookChange = (index: number, field: "title" | "author", value: string) => {
    setFavoriteBooks((prev) => {
      const next = [...prev];
      const current = next[index] || { title: "", author: "" };
      next[index] = { ...current, [field]: value };
      return next;
    });
  };

  const toggleLikedGenre = (genre: string) => {
    setLikedGenres((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= 3) return prev;
      return [...prev, genre];
    });
    setDislikedGenres((prev) => prev.filter((g) => g !== genre));
  };

  const toggleDislikedGenre = (genre: string) => {
    setDislikedGenres((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= 3) return prev;
      return [...prev, genre];
    });
    setLikedGenres((prev) => prev.filter((g) => g !== genre));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = useCallback(() => {
    onComplete({
      axes,
      favoriteBooks: favoriteBooks.map((b) => ({
        title: b.title.trim(),
        author: b.author?.trim() || undefined,
      })),
      kryptoniteBook:
        !noKryptonite && kryptonite.title.trim()
          ? {
              title: kryptonite.title.trim(),
              author: kryptonite.author?.trim() || undefined,
            }
          : null,
      likedGenres,
      dislikedGenres,
      favoriteAuthors: [],
      customName: customName.trim() || undefined,
      theme: selectedTheme,
    });
  }, [
    axes,
    favoriteBooks,
    noKryptonite,
    kryptonite,
    likedGenres,
    dislikedGenres,
    customName,
    selectedTheme,
    onComplete,
  ]);

  return (
    <div
      className={`rounded-3xl p-6 sm:p-10 border transition-all duration-300 shadow-2xl ${
        isDark
          ? "bg-[#0f1422]/90 border-slate-800 text-slate-100"
          : "bg-[#fffdfa]/95 border-stone-300 text-stone-900"
      }`}
    >
      {/* Прогресс-бар шагов */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-bold ${
              isDark
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                : "bg-amber-100 text-amber-900 border border-amber-300"
            }`}
          >
            {step + 1}
          </span>
          <span className="text-xs uppercase tracking-widest font-bold opacity-60">
            Шаг {step + 1} из 5
          </span>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-amber-500"
                  : i < step
                    ? "w-4 bg-amber-500/50"
                    : "w-2 bg-slate-700/40"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ШАГ 0: 3 Книги-Святыни */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <BookOpen size={20} />
                <h2 className="text-xl sm:text-2xl font-serif font-black">
                  3 Книги-Святыни
                </h2>
              </div>
              <p className="text-xs sm:text-sm opacity-70">
                Книги, которые сформировали твою читательскую оптику и оставили
                неизгладимый след в сердце.
              </p>
            </div>

            <div className="space-y-4">
              {favoriteBooks.map((book, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDark
                      ? "bg-slate-900/50 border-slate-800 focus-within:border-amber-500/50"
                      : "bg-stone-50 border-stone-200 focus-within:border-amber-600/50"
                  }`}
                >
                  <span className="block text-[11px] font-mono uppercase tracking-wider text-amber-500 font-bold mb-2">
                    Святыня №{idx + 1}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Название книги *"
                      value={book.title}
                      onChange={(e) => handleBookChange(idx, "title", e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 ${
                        isDark
                          ? "bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:ring-amber-400"
                          : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-amber-600"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Автор (необязательно)"
                      value={book.author || ""}
                      onChange={(e) => handleBookChange(idx, "author", e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 ${
                        isDark
                          ? "bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:ring-amber-400"
                          : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-amber-600"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ШАГ 1: Книга-Криптонит */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-400">
                <Skull size={20} />
                <h2 className="text-xl sm:text-2xl font-serif font-black">
                  Книга-Криптонит
                </h2>
              </div>
              <p className="text-xs sm:text-sm opacity-70">
                Книга, которую все хвалят, но от которой у тебя закатываются
                глаза. Твой личный литературный аллерген.
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${
                isDark
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-stone-50 border-stone-200"
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Название книги-криптонита"
                  disabled={noKryptonite}
                  value={kryptonite.title}
                  onChange={(e) =>
                    setKryptonite((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 ${
                    noKryptonite ? "opacity-30 cursor-not-allowed" : ""
                  } ${
                    isDark
                      ? "bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:ring-rose-400"
                      : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-rose-600"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Автор"
                  disabled={noKryptonite}
                  value={kryptonite.author || ""}
                  onChange={(e) =>
                    setKryptonite((prev) => ({ ...prev, author: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 ${
                    noKryptonite ? "opacity-30 cursor-not-allowed" : ""
                  } ${
                    isDark
                      ? "bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:ring-rose-400"
                      : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-rose-600"
                  }`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs select-none opacity-80 hover:opacity-100">
                <input
                  type="checkbox"
                  checked={noKryptonite}
                  onChange={(e) => setNoKryptonite(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>У меня нет явного криптонита, я великодушен к книгам</span>
              </label>
            </div>
          </motion.div>
        )}

        {/* ШАГ 2: Жанры и эффект Боссона */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <Compass size={20} />
                <h2 className="text-xl sm:text-2xl font-serif font-black">
                  Жанровые ориентиры
                </h2>
              </div>
              <p className="text-xs sm:text-sm opacity-70">
                Выбери до 3 любимых жанров (зелёные) и до 3 категорически отвергаемых
                (красные).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-xs uppercase font-bold tracking-wider text-emerald-400 mb-2">
                  Любимые жанры (выбрано: {likedGenres.length}/3):
                </span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_GENRES.map((g) => {
                    const isSelected = likedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleLikedGenre(g)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold"
                            : isDark
                              ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                              : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                        }`}
                      >
                        {isSelected && <Check size={12} className="inline mr-1" />}
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <span className="block text-xs uppercase font-bold tracking-wider text-rose-400 mb-2">
                  Отвергаемые жанры (эффект Боссона, выбрано: {dislikedGenres.length}/3):
                </span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_GENRES.map((g) => {
                    const isSelected = dislikedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleDislikedGenre(g)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-500/20 border-rose-400 text-rose-300 font-bold"
                            : isDark
                              ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                              : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                        }`}
                      >
                        {isSelected && "✕ "}
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ШАГ 3: 6 Осей восприятия */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <Sliders size={20} />
                <h2 className="text-xl sm:text-2xl font-serif font-black">
                  6 Шкал восприятия текста
                </h2>
              </div>
              <p className="text-xs sm:text-sm opacity-70">
                Настрой ползунки под свой естественный пульс чтения.
              </p>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              <CreativeSlider
                label="1. Фокус повествования"
                leftLabel="Сюжет, темп и действие"
                rightLabel="Рефлексия, смысл и глубина"
                value={axes.storyFocus}
                onChange={(val) => setAxes((prev) => ({ ...prev, storyFocus: val }))}
                theme={theme}
              />
              <CreativeSlider
                label="2. Эмоциональный спектр"
                leftLabel="Легкость и эскапизм"
                rightLabel="Тяжелая драма и катарсис"
                value={axes.emotionalWeight}
                onChange={(val) =>
                  setAxes((prev) => ({ ...prev, emotionalWeight: val }))
                }
                theme={theme}
              />
              <CreativeSlider
                label="3. Темп чтения"
                leftLabel="Стремительный экшен"
                rightLabel="Неспешное медитативное смакование"
                value={axes.pace}
                onChange={(val) => setAxes((prev) => ({ ...prev, pace: val }))}
                theme={theme}
              />
              <CreativeSlider
                label="4. Градус мрачности"
                leftLabel="Светлая надежда и уют"
                rightLabel="Экзистенциальная бездна и мрак"
                value={axes.darkness}
                onChange={(val) => setAxes((prev) => ({ ...prev, darkness: val }))}
                theme={theme}
              />
              <CreativeSlider
                label="5. Масштаб истории"
                leftLabel="Камерная локальная драма"
                rightLabel="Эпос, цивилизации и вселенные"
                value={axes.scope}
                onChange={(val) => setAxes((prev) => ({ ...prev, scope: val }))}
                theme={theme}
              />
              <CreativeSlider
                label="6. Сложность слога"
                leftLabel="Доступный чистый слог"
                rightLabel="Экспериментальный языковой лабиринт"
                value={axes.complexity}
                onChange={(val) => setAxes((prev) => ({ ...prev, complexity: val }))}
                theme={theme}
              />
            </div>
          </motion.div>
        )}

        {/* ШАГ 4: Финал и имя на билете */}
        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400">
                <Sparkles size={28} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black">
                Последний штрих перед печатью
              </h2>
              <p className="text-xs sm:text-sm opacity-70 max-w-md mx-auto">
                Укажи имя или псевдоним, который будет выгравирован на твоём
                читательском билете.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Имя на билете:
                </label>
                <input
                  type="text"
                  placeholder="Например: Фёдор или Читатель"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-base border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-600 focus:ring-amber-400"
                      : "bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-amber-600"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Стиль оформления билета:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTheme("dark")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selectedTheme === "dark"
                        ? "bg-slate-900 border-amber-400 text-amber-300 shadow-sm"
                        : "bg-slate-900/40 border-slate-800 text-slate-400"
                    }`}
                  >
                    🌙 Тайный орден
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTheme("craft")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selectedTheme === "craft"
                        ? "bg-amber-100 border-amber-600 text-amber-950 shadow-sm"
                        : "bg-stone-100 border-stone-300 text-stone-600"
                    }`}
                  >
                    ☀️ Крафтовая анкета
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Навигационные кнопки Вперёд / Назад */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800/40">
        {step > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ArrowLeft size={14} />
            Назад
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 0 && !isStep0Valid) ||
              (step === 1 && !isStep1Valid) ||
              (step === 2 && !isStep2Valid)
            }
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md ${
              (step === 0 && !isStep0Valid) ||
              (step === 1 && !isStep1Valid) ||
              (step === 2 && !isStep2Valid)
                ? "opacity-40 cursor-not-allowed bg-slate-700 text-slate-300"
                : "bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer shadow-amber-500/20"
            }`}
          >
            Далее
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg bg-linear-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-400 text-slate-950 cursor-pointer shadow-amber-500/30"
          >
            <Sparkles size={16} />
            {isLoading ? "Материализация..." : "Материализовать билет"}
          </button>
        )}
      </div>
    </div>
  );
}
