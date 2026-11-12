import { useState, useCallback } from "react";
import { ArrowLeft, Sparkles, Scroll, Sparkle } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { DnaStepFlow } from "./components/DnaStepFlow";
import { InteractiveTicket } from "./components/InteractiveTicket";
import {
  saveReadingDna,
  getReadingTicket,
  type ReadingDnaInputData,
  type ReadingDnaResponseData,
} from "@/lib/readingDnaApi";

export type DnaTheme = "dark" | "craft";

export default function ReadingDnaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");

  const [theme, setTheme] = useState<DnaTheme>("dark");
  const [isCrafting, setIsCrafting] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<ReadingDnaResponseData | null>(null);

  // Загрузка билета по параметру ?ticket=BS-XXXX-X
  const { data: loadedTicket } = useQuery({
    queryKey: ["readingDna", "ticket", ticketParam],
    queryFn: () => (ticketParam ? getReadingTicket(ticketParam) : null),
    enabled: Boolean(ticketParam),
  });

  const activeTicket = currentTicket || loadedTicket;

  const handleBack = useCallback(() => {
    if (isCrafting) {
      setIsCrafting(false);
      return;
    }
    if (activeTicket) {
      setCurrentTicket(null);
      setSearchParams({});
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [isCrafting, activeTicket, navigate, setSearchParams]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "craft" : "dark"));
  }, []);

  // Мутация сохранения ДНК
  const saveMutation = useMutation({
    mutationFn: (input: ReadingDnaInputData) => saveReadingDna(input),
    onSuccess: (saved) => {
      setCurrentTicket(saved);
      setIsCrafting(false);
      setSearchParams({ ticket: saved.ticketNumber });
    },
  });

  const handleCompleteFlow = useCallback(
    (data: ReadingDnaInputData) => {
      saveMutation.mutate(data);
    },
    [saveMutation]
  );

  const handleRetake = useCallback(() => {
    setCurrentTicket(null);
    setSearchParams({});
    setIsCrafting(true);
  }, [setSearchParams]);

  const handleDuelRedirect = useCallback(
    (ticketNumber: string) => {
      navigate(`/reading-dna/duel?ticket=${ticketNumber}`);
    },
    [navigate]
  );

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen transition-colors duration-500 py-16 px-4 sm:px-6 lg:px-8 ${
        isDark
          ? "bg-[#0b0f19] text-slate-200"
          : "bg-[#f8f5ee] text-stone-800"
      }`}
    >
      <SEOHead
        title="Книжный ДНК — литературный код и читательский билет | BookStrata"
        description="Пройди 60-секундный тест читательского вкуса, открой свой литературный архетип, получи номерной читательский билет тайного общества и проверь совместимость с друзьями."
        url="/reading-dna"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Книжный ДНК", url: "/reading-dna" },
        ]}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Breadcrumbs
            items={[{ label: "Главная", href: "/" }, { label: "Книжный ДНК" }]}
            theme={isDark ? "dark" : "light"}
          />

          {/* Анимированный переключатель темы без блока */}
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileHover={{ rotate: 180, scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            aria-label={isDark ? "Переключить на крафтовую анкету" : "Переключить на ночной архив"}
            title={isDark ? "Светлая крафтовая анкета" : "Темный ночной архив"}
            className="cursor-pointer bg-transparent border-0 p-1 text-2xl leading-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
          >
            <span className="inline-block will-change-transform drop-shadow-sm">
              {isDark ? "☀️" : "🌙"}
            </span>
          </motion.button>
        </div>

        {/* Кнопка «Назад» */}
        <button
          onClick={handleBack}
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-8 transition-colors cursor-pointer ${
            isDark
              ? "text-slate-400 hover:text-slate-200"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <ArrowLeft size={14} />
          Назад
        </button>

        {/* Главный заголовок и бейдж */}
        <div className="text-center space-y-4 mb-12">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
              isDark
                ? "bg-amber-500/10 border-amber-400/30 text-amber-300"
                : "bg-amber-200/50 border-amber-300 text-amber-900"
            }`}
          >
            <Sparkles size={14} />
            <span>Тайное книжное общество</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-serif">
            Книжный ДНК
          </h1>

          <p
            className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${
              isDark ? "text-slate-300" : "text-stone-600"
            }`}
          >
            Узнай свой истинный читательский архетип за 60 секунд. Материализуй
            свой персональный билет, получи радар литературных предпочтений и
            брось вызов друзьям на дуэль книжных вкусов.
          </p>
        </div>

        {/* 1. Если билет готов — показываем InteractiveTicket */}
        {activeTicket ? (
          <InteractiveTicket
            ticket={activeTicket}
            onRetake={handleRetake}
            onDuel={handleDuelRedirect}
          />
        ) : isCrafting ? (
          /* 2. Если пользователь в процессе создания — показываем пошаговый опрос DnaStepFlow */
          <DnaStepFlow
            theme={theme}
            onComplete={handleCompleteFlow}
            isLoading={saveMutation.isPending}
          />
        ) : (
          /* 3. Стартовый экран: Введение в 4 Касты и кнопка запуска теста */
          <div className="space-y-10">
            <div
              className={`relative rounded-3xl border p-8 sm:p-12 text-center transition-all shadow-xl overflow-hidden ${
                isDark
                  ? "bg-slate-900/60 border-slate-800 shadow-black/40"
                  : "bg-[#fffdf9] border-stone-300 shadow-amber-950/5"
              }`}
            >
              <div className="max-w-md mx-auto space-y-6 relative z-10">
                <div
                  className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto shadow-md ${
                    isDark
                      ? "bg-slate-800/80 border-amber-500/30 text-amber-400"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <Scroll size={32} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-serif font-black">
                    Твой персональный читательский билет
                  </h3>
                  <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                    Ответь на 5 вопросов: назови 3 главные книги своей жизни, один
                    криптонит и настрой 6 осей своего литературного пульса.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCrafting(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg bg-linear-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-400 text-slate-950 cursor-pointer shadow-amber-500/30"
                >
                  <Sparkle size={16} />
                  Пройти тест вкуса (60 секунд)
                </button>
              </div>
            </div>

            {/* Карточки 4 Читательских Каст */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`p-5 rounded-2xl border ${
                  isDark
                    ? "bg-[#101626]/80 border-slate-800"
                    : "bg-white border-stone-200"
                }`}
              >
                <span className="text-2xl block mb-2">🏛️</span>
                <h4 className="font-serif font-bold text-sm mb-1">Орден Разума</h4>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Интеллектуальная проза, философия, многослойный слог и поиск
                  скрытых смыслов.
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border ${
                  isDark
                    ? "bg-[#101626]/80 border-slate-800"
                    : "bg-white border-stone-200"
                }`}
              >
                <span className="text-2xl block mb-2">🗝️</span>
                <h4 className="font-serif font-bold text-sm mb-1">Орден Бездны</h4>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Темная классика, психологический хоррор, катарсис и бескомпромиссные
                  драмы.
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border ${
                  isDark
                    ? "bg-[#101626]/80 border-slate-800"
                    : "bg-white border-stone-200"
                }`}
              >
                <span className="text-2xl block mb-2">⚔️</span>
                <h4 className="font-serif font-bold text-sm mb-1">Орден Действия</h4>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Стремительные триллеры, детективы, космооперы и запойное чтение
                  до рассвета.
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border ${
                  isDark
                    ? "bg-[#101626]/80 border-slate-800"
                    : "bg-white border-stone-200"
                }`}
              >
                <span className="text-2xl block mb-2">🕯️</span>
                <h4 className="font-serif font-bold text-sm mb-1">Орден Света</h4>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Уютная исцеляющая проза, магический реализм, доброта и чистое
                  удовольствие от историй.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
