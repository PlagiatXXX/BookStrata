import { useState, useCallback } from "react";
import { ArrowLeft, Sparkles, Scroll, ShieldCheck, Compass } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";

export type DnaTheme = "dark" | "craft";

export default function ReadingDnaPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<DnaTheme>("dark");

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "craft" : "dark"));
  }, []);

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen transition-colors duration-500 py-20 px-4 sm:px-6 lg:px-8 ${
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

          {/* Анимированный переключатель темы без блока (в точности как на plagiatxxx.github.io/portfolio) */}
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

        {/* Превью рабочего пространства (заглушка перед подключением полного интерактива) */}
        <div
          className={`relative rounded-2xl border p-8 sm:p-12 text-center transition-all shadow-xl overflow-hidden ${
            isDark
              ? "bg-slate-900/60 border-slate-800 shadow-black/40"
              : "bg-[#fffdf9] border-stone-300 shadow-amber-950/5"
          }`}
        >
          {/* Фоновый декор */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

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
              <h2 className="text-xl sm:text-2xl font-bold font-serif">
                {isDark ? "Архив Ордена готовится к открытию" : "Ностальгическая анкета на верстке"}
              </h2>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? "text-slate-400" : "text-stone-600"
                }`}
              >
                Здесь будет развернут полноэкранный пошаговый опрос с креативными тактильными
                ползунками и живой материализацией читательского билета.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-medium">
              <div
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
                  isDark
                    ? "bg-slate-800/50 border-slate-700/50 text-slate-300"
                    : "bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Compass size={18} className="text-amber-500" />
                <span>12 Архетипов вкуса</span>
              </div>
              <div
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
                  isDark
                    ? "bg-slate-800/50 border-slate-700/50 text-slate-300"
                    : "bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <ShieldCheck size={18} className="text-amber-500" />
                <span>Слепая дуэль мнений</span>
              </div>
              <div
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
                  isDark
                    ? "bg-slate-800/50 border-slate-700/50 text-slate-300"
                    : "bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Sparkles size={18} className="text-amber-500" />
                <span>Книжные близнецы</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
