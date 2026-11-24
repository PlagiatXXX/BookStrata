import { useId } from "react";
import { RotateCcw, CheckCircle2, Lock, ArrowRight, Compass, ShieldCheck } from "lucide-react";
import type { ReadingDnaResponseData } from "@/lib/readingDnaApi";
import type { DnaTheme } from "../ReadingDnaPage";

export interface DnaRetestGateProps {
  ticket: ReadingDnaResponseData;
  theme: DnaTheme;
  isGuest: boolean;
  onStartRetest: () => void;
  onViewTicket: () => void;
  onLogin?: () => void;
}

const MAX_RETESTS = 3;

/**
 * Экран шлюза калибровки для пользователей, уже запечатавших билет.
 * Показывает статус текущего билета, счётчик попыток (из 3) и кнопку начала перекалибровки.
 */
export function DnaRetestGate({
  ticket,
  theme,
  isGuest,
  onStartRetest,
  onViewTicket,
  onLogin,
}: DnaRetestGateProps) {
  const isDark = theme === "dark";
  const titleId = useId();

  const retestCount = ticket.retestCount ?? 0;
  const retestsLeft = ticket.retestsLeft ?? Math.max(0, MAX_RETESTS - retestCount);
  const canRetest = !isGuest && retestsLeft > 0;

  return (
    <div className="w-full max-w-2xl mx-auto py-2 sm:py-4">
      {/* Карточка статуса архива */}
      <div
        className={`rounded-2xl border p-5 sm:p-7 shadow-lg transition-all ${
          isDark
            ? "bg-[#2b1d14]/85 border-[rgba(201,163,91,0.35)] text-[#efe3cc]"
            : "bg-[#fffdf7] border-[rgba(59,110,168,0.3)] text-[#2e2a24]"
        }`}
      >
        {/* Верхняя строка статуса */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-current/15">
          <div className="inline-flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg ${
                isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-600/15 text-emerald-800"
              }`}
            >
              <CheckCircle2 size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Билет запечатан
            </span>
          </div>

          <span
            className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
              isDark
                ? "bg-[#1e130c]/70 border-[rgba(201,163,91,0.3)] text-[#c9a35b]"
                : "bg-white border-[rgba(59,110,168,0.25)] text-[#3b6ea8]"
            }`}
          >
            #{ticket.ticketNumber}
          </span>
        </div>

        {/* Заголовок и текущий результат */}
        <div className="py-5 sm:py-6 text-center space-y-2.5">
          <h2
            id={titleId}
            className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isDark ? "font-serif text-[#efe3cc]" : "font-['Caveat',cursive] text-3xl sm:text-4xl text-[#2e2a24]"
            }`}
          >
            Читательский ДНК зафиксирован
          </h2>

          <p className="text-sm sm:text-base leading-relaxed opacity-90 max-w-lg mx-auto">
            Ваш текущий архетип —{" "}
            <b className="underline decoration-amber-500/50 decoration-2 underline-offset-4">
              «{ticket.archetypeName}»
            </b>
            {ticket.customName && (
              <span className="opacity-75"> ({ticket.customName})</span>
            )}
            .
          </p>

          {ticket.motto && (
            <p className="text-xs sm:text-sm italic font-serif opacity-75 max-w-md mx-auto pt-1">
              «{ticket.motto}»
            </p>
          )}
        </div>

        {/* Блок перекалибровки */}
        <div
          className={`rounded-xl p-4 sm:p-5 border space-y-4 ${
            isDark
              ? "bg-[#1f140d]/60 border-[rgba(201,163,91,0.25)]"
              : "bg-[#f8f5ee] border-[rgba(59,110,168,0.2)]"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                Архивная перекалибровка
              </div>
              <div className="text-xs sm:text-sm opacity-85 pt-0.5">
                Возможность скорректировать 6 осей вкуса и книги
              </div>
            </div>

            {/* Визуальные индикаторы попыток */}
            {!isGuest && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium opacity-80">
                  Осталось:
                </span>
                <div className="flex items-center gap-1.5" aria-label={`Осталось ${retestsLeft} из ${MAX_RETESTS} перекалибровок`}>
                  {Array.from({ length: MAX_RETESTS }).map((_, i) => {
                    const isAvailable = i < retestsLeft;
                    return (
                      <span
                        key={i}
                        title={isAvailable ? "Попытка доступна" : "Попытка использована"}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                          isAvailable
                            ? isDark
                              ? "bg-amber-500/20 border-amber-400 text-amber-300"
                              : "bg-[#b3412f]/15 border-[#b3412f] text-[#b3412f]"
                            : "bg-current/5 border-current/20 opacity-30 line-through"
                        }`}
                      >
                        {i + 1}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Предупреждения по статусу */}
          {isGuest ? (
            <div
              className={`p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-3 ${
                isDark
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <Lock size={16} className="shrink-0 mt-0.5 opacity-80" />
              <div className="space-y-1">
                <div className="font-semibold">Требуется вход в аккаунт</div>
                <div className="opacity-90 leading-relaxed text-xs">
                  Чтобы защитить читательский билет и получить 3 попытки архивной перекалибровки, войдите в свой профиль.
                </div>
              </div>
            </div>
          ) : retestsLeft > 0 ? (
            <p className="text-xs sm:text-sm leading-relaxed opacity-80">
              Литературный вкус развивается. Чтобы отпечаток оставался честным, доступно до <b>3 перекалибровок</b> на аккаунт. Вы сможете изменить оси и список книг — ответы будут предзаполнены вашими текущими данными. Попытка спишется только в момент запечатывания.
            </p>
          ) : (
            <div
              className={`p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-3 ${
                isDark
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <ShieldCheck size={16} className="shrink-0 mt-0.5 opacity-80" />
              <div className="space-y-1">
                <div className="font-semibold">Все 3 перекалибровки использованы</div>
                <div className="opacity-90 leading-relaxed text-xs">
                  Ваш читательский ДНК окончательно зафиксирован в реестре архива. Вы можете продолжить сравнивать вкусы и открывать книжных близнецов.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-6">
          {isGuest ? (
            <button
              type="button"
              onClick={onLogin}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                isDark ? "bg-[#8a2433] hover:bg-[#a32b3d]" : "bg-[#b3412f] hover:bg-[#c94935]"
              }`}
            >
              <Lock size={15} />
              <span>Войти для перекалибровки</span>
            </button>
          ) : canRetest ? (
            <button
              type="button"
              onClick={onStartRetest}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                isDark ? "bg-[#8a2433] hover:bg-[#a32b3d]" : "bg-[#b3412f] hover:bg-[#c94935]"
              }`}
            >
              <RotateCcw size={15} />
              <span>Начать перекалибровку ({retestsLeft} из {MAX_RETESTS})</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onViewTicket}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-colors cursor-pointer inline-flex items-center justify-center gap-2 ${
              isDark
                ? "bg-[#1e130c]/70 border-[rgba(201,163,91,0.3)] text-[#efe3cc] hover:bg-[#c9a35b]/15"
                : "bg-white border-[rgba(59,110,168,0.3)] text-[#2e2a24] hover:bg-[#3b6ea8]/10"
            }`}
          >
            <Compass size={15} className="opacity-70" />
            <span>Посмотреть мой билет</span>
            <ArrowRight size={14} className="opacity-60" />
          </button>
        </div>
      </div>
    </div>
  );
}
