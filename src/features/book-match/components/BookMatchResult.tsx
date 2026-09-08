// src/features/book-match/components/BookMatchResult.tsx
// Результат match: score, level, объяснение, сравнение ТЫ ↔ КНИГА.
// Показывается всегда, когда есть хотя бы одна настроенная ось.

import { Fragment } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { MatchResult } from "../domain/types";
import { AXIS_LABELS } from "../domain/types";
import { describeDiff } from "../domain/explainMatch";

interface BookMatchResultProps {
  result: MatchResult;
  onReset: () => void;
}

/** Цвет уровня → Tailwind класс. */
function levelColor(color: MatchResult["level"]["color"]): string {
  if (color === "emerald") return "text-emerald-400";
  if (color === "amber") return "text-amber-400";
  return "text-rose-400";
}

export function BookMatchResult({ result, onReset }: BookMatchResultProps) {
  const { score, level, diffs, activeAxesCount } = result;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="text-center">
        <div className="inline-block">
          <span className={`text-5xl md:text-6xl font-bold tabular-nums transition-colors duration-300 ${levelColor(level.color)}`}>
            {score}
          </span>
          <span className="text-2xl text-white/40">%</span>
        </div>

        <span className={`mt-2 block text-sm font-semibold tracking-wider transition-colors duration-300 ${levelColor(level.color)}`}>
          {level.label}
        </span>

        {activeAxesCount < 4 && (
          <p className="mt-1 text-xs text-white/30">
            {activeAxesCount} из 4 параметров настроены
          </p>
        )}
      </div>

      {/* Визуальное сравнение ТЫ ↔ КНИГА (только при ≥ 2 активных осях) */}
      {activeAxesCount >= 2 && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 text-xs">
          {/* Заголовки */}
          <div className="text-right text-white/40 font-medium">Вы</div>
          <div />
          <div className="text-white/40 font-medium">Книга</div>

          {/* Строки по осям */}
          {diffs.map((diff) => (
            <Fragment key={diff.axis}>
              {/* User bar */}
              <div key={`${diff.axis}-user`} className="flex items-center justify-end gap-2">
                <span className="text-white/50 w-16 text-right">{AXIS_LABELS[diff.axis].left}</span>
                <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-(--bp-primary)/60 transition-all duration-300"
                    style={{ width: `${diff.userValue}%` }}
                  />
                </div>
              </div>

              {/* Axis label */}
              <div key={`${diff.axis}-label`} className="flex items-center text-white/30">
                {diff.absDiff < 20 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : diff.absDiff >= 30 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : null}
              </div>

              {/* Book bar */}
              <div key={`${diff.axis}-book`} className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/40 transition-all duration-300"
                    style={{ width: `${diff.bookValue}%` }}
                  />
                </div>
                <span className="text-white/50 w-16">{AXIS_LABELS[diff.axis].right}</span>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {/* Объяснение — все оси в стабильном порядке */}
      <div className="space-y-2">
        {diffs.map((d) => {
          const isGood = d.absDiff < 20;
          const isBad = d.absDiff >= 40;
          return (
            <div key={d.axis} className="flex items-start gap-2 text-sm">
              {isGood ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : isBad ? (
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              )}
              <span className="text-white/70">
                <span className="text-white/90 font-medium">{d.label.split(" ↔ ")[0]}</span>
                {" — "}
                {describeDiff(d.absDiff, d.direction)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-white/25 text-center leading-relaxed">
        Совпадение не оценивает качество книги.
        <br />
        Оно показывает, насколько книга соответствует твоему запросу сейчас.
      </p>

      {/* Reset */}
      <div className="text-center">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
        >
          Сбросить настройки
        </button>
      </div>
    </div>
  );
}
