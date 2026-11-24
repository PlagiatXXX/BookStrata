import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring } from "motion/react";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export interface DnaWelcomeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onAccept: () => void;
}

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export function DnaWelcomeModal({
  isOpen,
  onDismiss,
  onAccept,
}: DnaWelcomeModalProps) {
  useBodyScrollLock(isOpen);

  // 3D-наклон билета на десктопе через useSpring
  const rotateX = useSpring(0, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 20 });

  // Бегущие номера билета: BS-XXXXX каждые 60мс в течение 1.4с, затем BS-00427
  const [ticketNo, setTicketNo] = useState("BS-XXXXX");

  useEffect(() => {
    if (!isOpen) {
      rotateX.set(0);
      rotateY.set(0);
      return;
    }

    const generateRandomTicket = () => {
      const digits = Math.floor(10000 + Math.random() * 90000);
      return `BS-${digits}`;
    };

    const intervalId = setInterval(() => {
      setTicketNo(generateRandomTicket());
    }, 60);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setTicketNo("BS-00427");
    }, 1400);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      setTicketNo("BS-XXXXX");
    };
  }, [isOpen, rotateX, rotateY]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = clamp((x / rect.width - 0.5) * 2, -1, 1);
    const normY = clamp((y / rect.height - 0.5) * 2, -1, 1);

    const MAX_TILT = 10;
    rotateX.set(-normY * MAX_TILT);
    rotateY.set(normX * MAX_TILT);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            data-testid="dna-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            className="absolute inset-0 bg-[rgba(15,9,5,0.75)] backdrop-blur-md"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dna-welcome-title"
            aria-describedby="dna-welcome-desc"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-90 sm:max-w-md select-none perspective-[1000px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="relative w-full rounded-2xl border border-[#5a4128] bg-linear-to-b from-[#3a2819] via-[#2a1d14] to-[#1e130c] p-6 sm:p-8 text-[#f2e6d0] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              {/* Декоративное фоновое тиснение / свечение */}
              <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[#d9a85b]/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 size-56 rounded-full bg-[#a3341f]/10 blur-3xl" />

              {/* Кнопка закрытия */}
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Закрыть"
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex size-8 items-center justify-center rounded-full text-[#a89478] hover:text-[#f2e6d0] hover:bg-white/5 transition-colors cursor-pointer border border-[#5a4128]/50"
              >
                <X className="size-4" />
              </button>

              {/* Заголовок модального окна */}
              <div className="flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#5a4128] bg-[#1f150e]/90 text-[10px] sm:text-xs font-mono font-medium tracking-widest text-[#d9a85b] uppercase mb-3">
                  <Sparkles className="size-3" />
                  <span>Архив читательского ДНК</span>
                </div>

                <h2
                  id="dna-welcome-title"
                  className="font-serif text-2xl sm:text-3xl font-bold text-[#f2e6d0] tracking-wide"
                >
                  Ваш билет уже ждёт
                </h2>

                <p
                  id="dna-welcome-desc"
                  className="text-xs sm:text-sm text-[#a89478] mt-2 max-w-sm font-sans leading-relaxed"
                >
                  Ответьте на шесть вопросов о вкусе — и получите номерной билет читателя с вашим ДНК.
                </p>
              </div>

              {/* Карточка 3D-билета с наклоном */}
              <motion.div
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: "preserve-3d",
                }}
                className="relative mt-6 rounded-xl border border-[#5a4128] bg-[#1e130c]/90 p-4 sm:p-5 shadow-inner"
              >
                {/* Перфорационные вырезы билета по бокам */}
                <div className="pointer-events-none absolute -left-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-[#2a1d14] border border-[#5a4128]" />
                <div className="pointer-events-none absolute -right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-[#2a1d14] border border-[#5a4128]" />

                {/* Верхний ряд */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-[#d9a85b]">
                  <span>BookStrata</span>
                  <span className="font-mono font-bold">{ticketNo}</span>
                </div>

                {/* Заголовок билета и штамп */}
                <div className="relative my-4 flex items-center justify-between">
                  <span className="font-serif text-base sm:text-lg font-bold tracking-wide text-[#f2e6d0]">
                    Билет читателя
                  </span>
                  <div className="relative flex items-center justify-center pr-2">
                    <motion.div
                      initial={{ scale: 2.2, opacity: 0, rotate: -12 }}
                      animate={{ scale: 1, opacity: 1, rotate: -12 }}
                      transition={{
                        delay: 1.3,
                        type: "spring",
                        stiffness: 300,
                        damping: 18,
                      }}
                      className="px-2.5 py-1 font-mono text-xs sm:text-sm font-black tracking-widest text-red-600 border-2 border-red-600 rounded uppercase select-none shadow-sm"
                    >
                      ОДОБРЕНО
                    </motion.div>
                  </div>
                </div>

                {/* Пунктирная линия */}
                <div className="border-t-2 border-dashed border-[#b9a47f] my-3" />

                {/* Нижний ряд */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-[#b9a47f]">
                  <span>6 осей вкуса</span>
                  <span>Книжный ДНК</span>
                </div>
              </motion.div>

              {/* Действия: кнопка CTA и закрыть */}
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={onAccept}
                  className="w-full py-3.5 px-6 rounded-xl bg-linear-to-r from-[#d9a85b] via-[#e5b96c] to-[#d9a85b] text-[#1e130c] font-serif font-bold text-base sm:text-lg tracking-wide hover:brightness-105 active:scale-[0.99] transition-all shadow-lg shadow-[#d9a85b]/15 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Узнать свой ДНК</span>
                  <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="w-full py-2 px-4 text-xs sm:text-sm text-[#a89478] hover:text-[#f2e6d0] transition-colors cursor-pointer font-sans text-center"
                >
                  Позже
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
