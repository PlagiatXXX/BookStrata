import { useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  Swords,
  Sparkles,
  Lock,
  ArrowRight,
  Share2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { DnaStepFlow } from "./DnaStepFlow";
import { OnboardingHub } from "./OnboardingHub";
import type {
  ReadingDnaResponseData,
  ReadingDnaDuelResultData,
  ReadingDnaInputData,
} from "@/lib/readingDnaApi";

export interface DuelScreenProps {
  targetTicket: ReadingDnaResponseData;
  onConductDuel: (input: {
    targetTicketNumber: string;
    challengerTicketNumber?: string;
    challengerName?: string;
    challengerDna?: ReadingDnaInputData;
  }) => Promise<ReadingDnaDuelResultData>;
}

export function DuelScreen({ targetTicket, onConductDuel }: DuelScreenProps) {
  const isDark = targetTicket.theme === "dark";
  const [isAnswering, setIsAnswering] = useState(false);
  const [existingTicketInput, setExistingTicketInput] = useState("");
  const [duelResult, setDuelResult] = useState<ReadingDnaDuelResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Дуэль с вводом своего номера билета
  const handleExistingTicketDuel = useCallback(async () => {
    if (!existingTicketInput.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await onConductDuel({
        targetTicketNumber: targetTicket.ticketNumber,
        challengerTicketNumber: existingTicketInput.trim(),
      });
      setDuelResult(res);
    } catch {
      setErrorMsg("Не удалось найти билет с таким номером. Проверь код билета.");
    } finally {
      setIsLoading(false);
    }
  }, [existingTicketInput, targetTicket.ticketNumber, onConductDuel]);

  // Дуэль через прохождение опроса
  const handleFlowComplete = useCallback(
    async (challengerDna: ReadingDnaInputData) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await onConductDuel({
          targetTicketNumber: targetTicket.ticketNumber,
          challengerName: challengerDna.customName,
          challengerDna,
        });
        setDuelResult(res);
        setIsAnswering(false);
      } catch {
        setErrorMsg("Ошибка при расчете дуэли. Попробуйте еще раз.");
      } finally {
        setIsLoading(false);
      }
    },
    [targetTicket.ticketNumber, onConductDuel]
  );

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* 1. ЕСЛИ РЕЗУЛЬТАТ ДУЭЛИ ГОТОВ — ПОКАЗЫВАЕМ ЭКРАН ПОБЕДЫ / СОВМЕСТИМОСТИ */}
      {duelResult ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl border p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden ${
            isDark
              ? "bg-[#0c101d] border-amber-500/40 text-slate-100"
              : "bg-[#fbf7ed] border-stone-400 text-stone-900"
          }`}
        >
          {/* Столкновение мечей */}
          <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 mb-4 animate-bounce">
            <Swords size={36} />
          </div>

          <span className="block text-[11px] font-mono uppercase tracking-[0.2em] font-extrabold opacity-75 mb-2">
            ИТОГ ЛИТЕРАТУРНОЙ ДУЭЛИ
          </span>

          {/* Большой процент совместимости */}
          <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-amber-400 mb-3">
            {duelResult.compatibility}%
          </div>

          {/* Вердикт дуэли */}
          <h3 className="text-xl sm:text-2xl font-serif font-black mb-3">
            {duelResult.verdict}
          </h3>

          <p className="text-xs sm:text-sm opacity-75 max-w-md mx-auto mb-8">
            Совместимость с билетом #{targetTicket.ticketNumber} ({targetTicket.archetypeName})
          </p>

          {/* Раскрытие карт: Святыни цели */}
          <div className="p-5 rounded-2xl border text-left mb-8 bg-slate-900/60 border-slate-800">
            <span className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Раскрытые книги оппонента ({targetTicket.customName || "Читатель"}):
            </span>
            <div className="flex flex-wrap gap-2">
              {targetTicket.favoriteBooks.map((b, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800/80 border-slate-700 text-slate-200"
                >
                  📖 {b.title}
                </span>
              ))}
            </div>

            {targetTicket.kryptoniteBook && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs">
                <AlertTriangle size={14} className="text-rose-400" />
                <span className="opacity-75">Криптонит оппонента:</span>
                <span className="font-bold line-through text-rose-300">
                  {targetTicket.kryptoniteBook.title}
                </span>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "Итог дуэли BookStrata",
                    text: `Наша совместимость с читателем ${targetTicket.customName || ""} — ${duelResult.compatibility}%! ${duelResult.verdict}`,
                    url: window.location.href,
                  });
                }
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 cursor-pointer shadow-lg"
            >
              <Share2 size={15} />
              Поделиться итогом
            </button>

            <button
              type="button"
              onClick={() => setDuelResult(null)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-700 hover:bg-slate-800 cursor-pointer text-slate-300"
            >
              <RotateCcw size={15} />
              Сыграть заново
            </button>
          </div>

          <OnboardingHub
            ticketNumber={targetTicket.ticketNumber}
            archetypeName={targetTicket.archetypeName}
            theme={targetTicket.theme as "dark" | "craft"}
          />
        </motion.div>
      ) : isAnswering ? (
        /* 2. ЕСЛИ В ПРОЦЕССЕ ОПРОСА ОППОНЕНТА */
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsAnswering(false)}
            className="text-xs uppercase tracking-wider font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            ← Отмена
          </button>
          <DnaStepFlow
            theme={targetTicket.theme as "dark" | "craft"}
            onComplete={handleFlowComplete}
            isLoading={isLoading}
          />
        </div>
      ) : (
        /* 3. КАРТОЧКА ВЫЗОВА: ПРИНЯТЬ ВЫЗОВ ИЛИ ВВЕСТИ НОМЕР СВОЕГО БИЛЕТА */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-8 sm:p-12 shadow-2xl relative overflow-hidden ${
            isDark
              ? "bg-[#0c101d] border-amber-500/40 text-slate-100"
              : "bg-[#fbf7ed] border-stone-400 text-stone-900"
          }`}
        >
          {/* Бейдж дуэли */}
          <div className="flex items-center gap-2 text-amber-400 mb-4">
            <Swords size={22} />
            <span className="text-xs font-mono uppercase tracking-[0.2em] font-extrabold">
              Литературный вызов
            </span>
          </div>

          <div className="space-y-2 mb-6">
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">
              {targetTicket.customName || "Читатель"} бросил вам вызов!
            </h2>
            <p className="text-xs sm:text-sm opacity-75 leading-relaxed max-w-lg">
              Проверьте, соулмейты ли вы в литературе или ваши книжные вкусы
              непримиримы. Вызов отправлен по билету #{targetTicket.ticketNumber}.
            </p>
          </div>

          {/* Карточка цели со скрытыми святынями */}
          <div className="p-5 rounded-2xl border bg-slate-900/60 border-slate-800 space-y-3 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  АРХЕТИП СОПЕРНИКА
                </span>
                <span className="font-serif font-bold text-lg text-slate-100">
                  {targetTicket.archetypeName}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-400 border border-slate-800 px-2 py-1 rounded-lg">
                #{targetTicket.ticketNumber}
              </span>
            </div>

            {/* Завеса тайны: скрытые книги */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
              <Lock size={14} className="text-amber-400" />
              <span>3 Книги-Святыни и Криптонит скрыты до окончания дуэли</span>
            </div>
          </div>

          {/* Выбор: Пройти тест или Ввести существующий номер билета */}
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setIsAnswering(true)}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-linear-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 text-slate-950 shadow-lg shadow-amber-500/25"
            >
              <Sparkles size={16} />
              Принять вызов (пройти тест за 60 секунд)
              <ArrowRight size={16} />
            </button>

            <div className="relative flex py-2 items-center">
              <div className="grow border-t border-slate-800"></div>
              <span className="shrink mx-4 text-xs font-mono uppercase tracking-widest opacity-50">
                ИЛИ
              </span>
              <div className="grow border-t border-slate-800"></div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider opacity-75">
                Уже есть свой читательский билет?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Введи номер (например BS-7492-X)"
                  value={existingTicketInput}
                  onChange={(e) => setExistingTicketInput(e.target.value)}
                  className="grow px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={handleExistingTicketDuel}
                  disabled={isLoading || !existingTicketInput.trim()}
                  className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isLoading ? "Дуэль..." : "Сразиться"}
                </button>
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-400 pt-1">{errorMsg}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
