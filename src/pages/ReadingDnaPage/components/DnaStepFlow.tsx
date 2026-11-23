import { useState, useCallback, useRef, useEffect } from "react";
import { JellySlider } from "@/components/JellySlider/JellySlider";
import { BookChipInput } from "./BookChipInput";
import { getRubricLabel } from "@/features/book-match/domain/types";
import type {
  ReadingDnaInputData,
  DnaBookItemData,
  DnaAxesData,
} from "@/lib/readingDnaApi";

export interface DnaStepFlowProps {
  onComplete: (data: ReadingDnaInputData) => void;
  onAxisChange?: (axis: keyof DnaAxesData, value: number) => void;
  onAxisStepChange?: (axisStep: number) => void;
  onBooksChange?: (
    favorite: (DnaBookItemData | null)[],
    kryptonite: DnaBookItemData | null
  ) => void;
  onStepChange?: (step: number) => void;
  onTouchedAxesChange?: (touched: Record<string, boolean>) => void;
  onNameChange?: (name: string) => void;
  isLoading?: boolean;
  theme?: "dark" | "craft" | "light";
  initialName?: string;
  initialStep?: number;
  initialAxes?: DnaAxesData;
  initialBooks?: (DnaBookItemData | null)[];
  initialKryptonite?: DnaBookItemData | null;
  initialTouchedAxes?: Record<string, boolean>;
}

const AXIS_QUESTIONS = [
  {
    key: "storyFocus" as const,
    name: "Сюжет ↔ Рефлексия",
    question: "Что вам нравится в книге?",
    left: { title: "Сюжет", desc: "стремительный темп, драйв, загадки" },
    right: { title: "Рефлексия", desc: "глубокий психологизм, философия" },
    marks: ["Лёгкий бриз", "Баланс", "Глубоководное погружение"],
  },
  {
    key: "emotionalWeight" as const,
    name: "Легко ↔ Тяжело",
    question: "Сколько усилий вы готовы вложить?",
    left: { title: "Легко", desc: "читается за вечер, отдых для ума" },
    right: { title: "Тяжело", desc: "требует сил и тишины" },
    marks: ["Лёгкий лист", "Баланс", "Каменная плита"],
  },
  {
    key: "pace" as const,
    name: "Быстро ↔ Погружение",
    question: "Как вы предпочитаете читать?",
    left: { title: "Быстро", desc: "по книге за ночь" },
    right: { title: "Погружение", desc: "растягиваю на недели" },
    marks: ["Один присест", "Баланс", "Неспешный омут"],
  },
  {
    key: "darkness" as const,
    name: "Светло ↔ Мрачно",
    question: "Какое настроение вам ближе?",
    left: { title: "Светло", desc: "тепло, надежда, свет" },
    right: { title: "Мрачно", desc: "тени, тревога, тьма" },
    marks: ["Рассвет", "Сумерки", "Полночь"],
  },
  {
    key: "scope" as const,
    name: "Камерное ↔ Эпическое",
    question: "Какого масштаба история нужна вам?",
    left: { title: "Камерное", desc: "одна комната, один голос" },
    right: { title: "Эпическое", desc: "миры, века, армии" },
    marks: ["Свеча", "Баланс", "Целая империя"],
  },
  {
    key: "complexity" as const,
    name: "Доступное ↔ Многослойное",
    question: "Любите разгадывать книгу?",
    left: { title: "Доступное", desc: "ясно с первой страницы" },
    right: { title: "Многослойное", desc: "двойное дно, шифры" },
    marks: ["Открытая дверь", "Баланс", "Лабиринт"],
  },
];

export function DnaStepFlow({
  onComplete,
  onAxisChange,
  onAxisStepChange,
  onBooksChange,
  onStepChange,
  onTouchedAxesChange,
  onNameChange,
  isLoading = false,
  theme = "craft",
  initialName = "",
  initialStep = 0,
  initialAxes,
  initialBooks,
  initialKryptonite,
  initialTouchedAxes,
}: DnaStepFlowProps) {
  const isDark = theme === "dark";
  const [step, setStep] = useState(initialStep);
  const [customName, setCustomName] = useState(initialName);

  // Значения 6 осей восприятия: по умолчанию стоят на 0
  const [axes, setAxes] = useState<DnaAxesData>(() => initialAxes || {
    storyFocus: 0,
    emotionalWeight: 0,
    pace: 0,
    darkness: 0,
    scope: 0,
    complexity: 0,
  });

  // Отслеживание взаимодействия пользователя с осями (для блокировки кнопки Дальше)
  const [touchedAxes, setTouchedAxes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { ...(initialTouchedAxes || {}) };
    if (initialAxes) {
      Object.entries(initialAxes).forEach(([k, v]) => {
        if (typeof v === "number" && v > 0) {
          initial[k] = true;
        }
      });
    }
    return initial;
  });

  const touchedAxesRef = useRef(touchedAxes);
  useEffect(() => {
    touchedAxesRef.current = touchedAxes;
  }, [touchedAxes]);

  // Книги: 3 священные + 1 криптонит
  const [favoriteBooks, setFavoriteBooks] = useState<(DnaBookItemData | null)[]>(
    () => initialBooks || []
  );
  const [kryptonite, setKryptonite] = useState<DnaBookItemData | null>(() => initialKryptonite ?? null);

  const currentAxis = step < 6 ? AXIS_QUESTIONS[step] : null;

  // Кнопка «Дальше» активна, только если пользователь взаимодействовал с ползунком
  const isCurrentAxisActive = currentAxis
    ? Boolean(touchedAxes[currentAxis.key] || (axes[currentAxis.key] ?? 0) > 0)
    : true;

  const handleSliderChange = useCallback(
    (val: number) => {
      if (!currentAxis) return;
      setAxes((prev) => ({
        ...prev,
        [currentAxis.key]: val,
      }));
      if (!touchedAxesRef.current[currentAxis.key]) {
        const next = { ...touchedAxesRef.current, [currentAxis.key]: true };
        touchedAxesRef.current = next;
        setTouchedAxes(next);
        onTouchedAxesChange?.(next);
      }
      onAxisChange?.(currentAxis.key, val);
    },
    [currentAxis, onAxisChange, onTouchedAxesChange]
  );

  const handleNext = useCallback(() => {
    if (step < 6) {
      const nextStep = step + 1;
      setStep(nextStep);
      onAxisStepChange?.(nextStep + 1);
      onStepChange?.(nextStep);
    }
  }, [step, onAxisStepChange, onStepChange]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      onAxisStepChange?.(prevStep + 1);
      onStepChange?.(prevStep);
    }
  }, [step, onAxisStepChange, onStepChange]);

  const handleBooksUpdate = useCallback(
    (
      newBooks: (DnaBookItemData | null)[],
      newKryptonite: DnaBookItemData | null
    ) => {
      setFavoriteBooks(newBooks);
      setKryptonite(newKryptonite);
      onBooksChange?.(newBooks, newKryptonite);
    },
    [onBooksChange]
  );

  const filledBooks = favoriteBooks.filter(
    (book): book is DnaBookItemData => Boolean(book)
  );

  const handleNameInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomName(val);
      onNameChange?.(val);
    },
    [onNameChange]
  );

  const handleSeal = useCallback(() => {
    onComplete({
      axes,
      favoriteBooks: filledBooks,
      kryptoniteBook: kryptonite,
      likedGenres: [],
      dislikedGenres: [],
      favoriteAuthors: [],
      customName: customName.trim() || undefined,
      theme: isDark ? "dark" : "craft",
    });
  }, [axes, filledBooks, kryptonite, customName, isDark, onComplete]);

  return (
    <div className="w-full flex flex-col justify-between space-y-4">
      {/* Прогресс со звёздочками ✦ ✦ ✦ ✦ ✦ ✦ и разделительной линией под ними */}
      <div className="space-y-2 select-none">
        <div className="flex justify-between items-center text-sm sm:text-base px-1">
          {AXIS_QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={`transition-colors ${
                i <= step
                  ? isDark
                    ? "text-[#c9a35b] drop-shadow-[0_0_6px_rgba(201,163,91,0.6)] font-bold"
                    : "text-[#3b6ea8] drop-shadow-[0_0_4px_rgba(59,110,168,0.4)] font-bold"
                  : isDark
                    ? "text-[#a89678]/40"
                    : "text-[#6f6553]/40"
              }`}
            >
              ✦
            </span>
          ))}
        </div>

        {/* Тонкая разделительная линия под звёздочками на всю ширину карточки */}
        <div
          className={`h-0.5 w-full rounded-full ${
            isDark ? "bg-[rgba(201,163,91,0.35)]" : "bg-[rgba(59,110,168,0.35)]"
          }`}
        />
      </div>

      {/* ШАГИ 0..5: 6 шкал калибровки вкуса */}
      {step < 6 && currentAxis && (
        <div className="space-y-4 animate-fade-in">
          <h2
            className={`text-lg sm:text-xl font-bold tracking-tight ${
              isDark
                ? "font-serif text-[#efe3cc]"
                : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
            }`}
          >
            {currentAxis.question}
          </h2>

          {/* Карточки полюсов */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-lg border border-dashed text-xs transition-colors ${
                isDark
                  ? "border-[rgba(201,163,91,0.3)] bg-[#24170f]/50 text-[#a89678]"
                  : "border-[rgba(59,110,168,0.3)] bg-white/50 text-[#6f6553]"
              }`}
            >
              <b
                className={`block text-xs sm:text-sm mb-0.5 ${
                  isDark ? "text-[#efe3cc]" : "text-[#2e2a24]"
                }`}
              >
                {currentAxis.left.title}
              </b>
              <span>{currentAxis.left.desc}</span>
            </div>

            <div
              className={`p-3 rounded-lg border border-dashed text-xs transition-colors ${
                isDark
                  ? "border-[rgba(201,163,91,0.3)] bg-[#24170f]/50 text-[#a89678]"
                  : "border-[rgba(59,110,168,0.3)] bg-white/50 text-[#6f6553]"
              }`}
            >
              <b
                className={`block text-xs sm:text-sm mb-0.5 ${
                  isDark ? "text-[#efe3cc]" : "text-[#2e2a24]"
                }`}
              >
                {currentAxis.right.title}
              </b>
              <span>{currentAxis.right.desc}</span>
            </div>
          </div>

          {/* Jelly Slider с физикой пружин, всплывающей каплей и пояснением на уровне 0 и 100 */}
          <div className="pt-2 pb-2">
            <JellySlider
              value={axes[currentAxis.key]}
              onChange={handleSliderChange}
              theme={isDark ? "dark" : "craft"}
              ariaLabel={currentAxis.name}
              caption={
                <span
                  className={`text-xs sm:text-[13px] leading-snug font-medium transition-colors duration-200 block ${
                    isDark ? "text-amber-300/90" : "text-amber-900"
                  }`}
                >
                  {getRubricLabel(currentAxis.key, axes[currentAxis.key])}
                </span>
              }
            />
          </div>

          {/* Навигационные кнопки */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all active:scale-[0.98] cursor-pointer ${
                isDark
                  ? "border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  : "border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10 disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              Назад
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!isCurrentAxisActive}
              className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.98] shadow-md cursor-pointer ${
                isDark
                  ? "bg-[#8a2433] hover:bg-[#a32b3d] disabled:opacity-35 disabled:cursor-not-allowed"
                  : "bg-[#b3412f] hover:bg-[#c94935] disabled:opacity-35 disabled:cursor-not-allowed"
              }`}
            >
              Дальше
            </button>
          </div>
        </div>
      )}

      {/* ШАГ 6: Печать: ваши книги (В точности как на скриншоте!) */}
      {step === 6 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h2
              className={`text-lg sm:text-xl font-bold tracking-tight mb-1 ${
                isDark
                  ? "font-serif text-[#efe3cc]"
                  : "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#2e2a24]"
              }`}
            >
              Печать: ваши книги
            </h2>
            <p className="text-xs opacity-75 leading-relaxed">
              Введите название: книга подтянется из каталога BookStrata. Первые три
              станут священными, четвёртая — криптонитом.
            </p>
          </div>

          {/* Поле ввода + чипы выбранных книг */}
          <BookChipInput
            books={favoriteBooks}
            kryptonite={kryptonite}
            onChange={handleBooksUpdate}
            theme={isDark ? "dark" : "light"}
          />

          {/* Поле имени / ника для билета и вызовов на дуэль */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="dna-custom-name"
              className="block text-xs font-semibold opacity-85"
            >
              Ваше имя или ник на билете <span className="font-normal opacity-60">(необязательно)</span>
            </label>
            <input
              id="dna-custom-name"
              type="text"
              maxLength={50}
              value={customName}
              onChange={handleNameInputChange}
              placeholder="Например, Саша или @bookworm"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-all ${
                isDark
                  ? "bg-[#24170f] border-[rgba(201,163,91,0.35)] text-[#efe3cc] placeholder-[#a89678]/60 focus:border-[#c9a35b]"
                  : "bg-white border-[rgba(59,110,168,0.35)] text-[#2e2a24] placeholder-[#6f6553]/60 focus:border-[#3b6ea8]"
              }`}
            />
            <p className="text-[11px] opacity-60">
              Отобразится на читательском билете и в приглашении на сравнение вкусов.
            </p>
          </div>

          {/* Навигационные кнопки */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={handleBack}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all active:scale-[0.98] cursor-pointer ${
                isDark
                  ? "border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/10"
                  : "border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
              }`}
            >
              Назад
            </button>

            <button
              type="button"
              disabled={filledBooks.length < 3 || isLoading}
              onClick={handleSeal}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.98] shadow-md cursor-pointer ${
                isDark
                  ? "bg-[#8a2433] hover:bg-[#a32b3d] disabled:opacity-40 disabled:cursor-not-allowed"
                  : "bg-[#b3412f] hover:bg-[#c94935] disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {isLoading ? "Запечатывание..." : "Запечатать билет"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
