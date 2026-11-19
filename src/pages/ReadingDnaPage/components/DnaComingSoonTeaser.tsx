import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Compass, Sparkles, Swords, Ticket } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";

export function DnaComingSoonTeaser(): ReactElement {
  return (
    <div className="min-h-screen bg-[#0d0907] text-[#f7ede2] font-sans relative overflow-hidden flex flex-col justify-between selection:bg-amber-600/30 selection:text-amber-200">
      <SEOHead
        title="Книжный ДНК — Скоро | BookStrata"
        description="Интерактивный спецпроект BookStrata: определите свою читательскую формулу по 6 осям восприятия, откройте архетип и получите винтажный читательский билет."
      />

      {/* Фоновые градиенты и свечение */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 10%, rgba(217, 119, 6, 0.28), transparent 70%), radial-gradient(ellipse at 80% 90%, rgba(180, 83, 9, 0.18), transparent 60%)",
        }}
      />

      {/* Верхняя навигационная панель */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-amber-200/80 hover:text-amber-100 transition-colors py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-amber-900/30"
        >
          <ArrowLeft size={16} />
          <span>На главную</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-linear-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-950/50">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-amber-100">
            BookStrata
          </span>
        </div>
      </header>

      {/* Основной контент тизера */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center space-y-8 my-auto">
        {/* Бейдж статуса */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border uppercase bg-amber-500/15 border-amber-500/35 text-amber-400 shadow-lg shadow-amber-950/40">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Спецпроект BookStrata · Скоро открытие</span>
        </div>

        {/* Главный заголовок */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-amber-100 leading-tight">
            Книжный ДНК: узнайте свою читательскую формулу
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-amber-200/75 leading-relaxed">
            Мы проводим закрытое тестирование спецпроекта. Совсем скоро каждый читатель сможет
            пройти тест по 6 осям восприятия, определить свой редкий архетип из 4 великих Орденов
            и получить винтажный читательский билет.
          </p>
        </div>

        {/* 4 карточки возможностей */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-3xl mx-auto text-left pt-2">
          <div className="p-4 rounded-xl border border-amber-900/40 bg-black/40 backdrop-blur-xs space-y-1.5 transition-all hover:border-amber-700/50">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Compass size={16} />
              <span>6 дилемм вкуса</span>
            </div>
            <p className="text-xs text-amber-200/65 leading-relaxed">
              Динамика сюжета против густой атмосферы, легкий отдых против катарсиса, темп, мрак и масштаб.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-900/40 bg-black/40 backdrop-blur-xs space-y-1.5 transition-all hover:border-amber-700/50">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <BookOpen size={16} />
              <span>16 редких архетипов</span>
            </div>
            <p className="text-xs text-amber-200/65 leading-relaxed">
              4 великих Ордена читателей (Смыслы, Бездна, Действие, Свет) с уникальными титулами и цитатами.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-900/40 bg-black/40 backdrop-blur-xs space-y-1.5 transition-all hover:border-amber-700/50">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Swords size={16} />
              <span>Литературная дуэль</span>
            </div>
            <p className="text-xs text-amber-200/65 leading-relaxed">
              Сравнение формул чтения с друзьями, поиск литературных близнецов и процент совпадения вкусов.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-900/40 bg-black/40 backdrop-blur-xs space-y-1.5 transition-all hover:border-amber-700/50">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Ticket size={16} />
              <span>Винтажный читательский билет</span>
            </div>
            <p className="text-xs text-amber-200/65 leading-relaxed">
              Персональный номерной билет с архивной сургучной печатью и экспортом для печати и соцсетей.
            </p>
          </div>
        </div>

        {/* Кнопки перехода */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md bg-white/10 hover:bg-white/15 text-amber-100 border border-amber-800/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft size={16} />
            <span>На главную</span>
          </Link>
          <Link
            to="/tier-lists"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Смотреть рейтинги</span>
          </Link>
        </div>
      </main>

      {/* Футер */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-amber-200/40">
        BookStrata · Независимый проект книжных рейтингов и читательских психотипов
      </footer>
    </div>
  );
}
