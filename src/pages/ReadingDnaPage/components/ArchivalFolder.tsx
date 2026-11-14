import type { ReactNode } from "react";
import { ShieldAlert, FileText } from "lucide-react";

export interface ArchivalFolderProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  caseNumber?: string;
  theme?: "dark" | "craft";
}

export function ArchivalFolder({
  leftContent,
  rightContent,
  caseNumber = "BS-04821-DNA",
  theme = "dark",
}: ArchivalFolderProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`relative w-full flex-1 flex flex-col transition-colors duration-500 my-2 sm:my-4 ${
        isDark ? "theme-dark text-slate-200" : "theme-craft text-stone-800"
      }`}
    >
      {/* Верхний архивный ярлык папки (Tab / Выступающий ярлычок дела) */}
      <div className="flex items-center justify-between px-2 sm:px-6 mb-[-1px] relative z-20">
        <div
          className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-t-xl border-t border-x text-[10px] font-mono uppercase tracking-[0.18em] shadow-xs select-none ${
            isDark
              ? "bg-[#111726] border-amber-500/25 text-amber-300/90 shadow-black/40"
              : "bg-[#f4efe4] border-stone-300 text-stone-700 shadow-stone-300/30"
          }`}
        >
          <FileText size={12} className="text-amber-500/80" />
          <span>Архив тайного общества</span>
          <span className="opacity-40">•</span>
          <span className="font-bold">Дело № {caseNumber}</span>
          <span className="opacity-40">•</span>
          <span
            className={`inline-flex items-center gap-1 font-bold ${
              isDark ? "text-rose-400/90" : "text-rose-700"
            }`}
          >
            <ShieldAlert size={10} />
            Строго конфиденциально
          </span>
        </div>

        {/* Дополнительная архивная метка справа */}
        <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono tracking-widest opacity-40 uppercase">
          <span>Секция калибровки</span>
          <span>//</span>
          <span>Формуляр № 1</span>
        </div>
      </div>

      {/* Основной корпус раскрытой папки (два листа) */}
      <div
        className={`relative flex-1 rounded-2xl sm:rounded-3xl border shadow-xl overflow-hidden transition-all duration-500 flex flex-col ${
          isDark
            ? "bg-[#0f1422] border-amber-500/20 shadow-black/80"
            : "bg-[#f8f5ee] border-stone-300 shadow-stone-400/20"
        }`}
      >
        {/* Текстура фонового картона/кожи */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${
              isDark ? "#ffffff" : "#000000"
            } 1px, transparent 0)`,
            backgroundSize: "16px 16px",
          }}
        />

        {/* Двухстраничный грид на весь экран */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 w-full min-h-[580px] lg:min-h-[calc(100vh-210px)]">
          {/* Левый лист: манифест и опросник */}
          <div className="lg:col-span-6 p-4 sm:p-6 lg:p-7 xl:p-8 flex flex-col justify-between w-full h-full">
            {leftContent}
          </div>

          {/* Центральный корешок папки (вертикальный теневой шов на десктопе) */}
          <div
            data-testid="archival-folder-spine"
            className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] pointer-events-none z-20"
          >
            <div
              className={`h-full w-full ${
                isDark
                  ? "bg-linear-to-b from-amber-500/20 via-black/40 to-amber-500/20 shadow-[0_0_12px_rgba(0,0,0,0.8)]"
                  : "bg-linear-to-b from-stone-300 via-stone-400/40 to-stone-300 shadow-[0_0_10px_rgba(0,0,0,0.1)]"
              }`}
            />
            {/* Имитация прострочки нитью корешка */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(to bottom, ${
                  isDark ? "#d4af37" : "#78716c"
                } 4px, transparent 4px)`,
                backgroundSize: "2px 10px",
              }}
            />
          </div>

          {/* Правый лист: живой формуляр билета с радаром на всю доступную ширину */}
          <div
            className={`lg:col-span-6 p-4 sm:p-6 lg:p-7 xl:p-8 flex flex-col items-center justify-center relative w-full h-full ${
              isDark ? "bg-[#0b0f19]/70" : "bg-[#fcfaf6]/70"
            }`}
          >
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
