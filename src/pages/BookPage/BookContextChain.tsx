// src/pages/BookPage/BookContextChain.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookContextChainItem } from "@/lib/bookApi";

interface BookContextChainProps {
  items: BookContextChainItem[];
}

export function BookContextChain({ items }: BookContextChainProps) {
  // Индекс открытого тапом тултипа (mobile/touch); null — всё закрыто
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Горизонтальный сдвиг тултипа (px) от центрированной позиции —
  // чтобы тултип не выходил за края экрана на мобильных
  const [tooltipShift, setTooltipShift] = useState<Record<number, number>>({});
  const btnRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const tipRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Фильтруем невалидные элементы (защита от мусора в JSON из админки)
  const valid = useMemo(
    () =>
      items.filter(
        (i) => i && typeof i.icon === "string" && i.icon && i.title && i.text,
      ),
    [items],
  );

  // Закрываем тултип при клике вне цепочки (клики внутри — stopPropagation)
  useEffect(() => {
    if (activeIdx === null) return;
    const close = () => setActiveIdx(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [activeIdx]);

  // Выравнивание тултипа: центрируем по иконке, но прижимаем к краю viewport,
  // чтобы контент не обрезался (отступ 12px). Сдвиг — в px поверх -translate-x-1/2.
  const alignTooltip = useCallback((idx: number) => {
    const btn = btnRefs.current.get(idx);
    const tip = tipRefs.current.get(idx);
    if (!btn || !tip) return;
    const btnRect = btn.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    // jsdom и другие окружения без реальной геометрии — пропускаем
    if (!btnRect.width || !tipRect.width) return;
    const margin = 12;
    const naturalLeft = btnRect.left + btnRect.width / 2 - tipRect.width / 2;
    const clampedLeft = Math.max(
      margin,
      Math.min(naturalLeft, window.innerWidth - tipRect.width - margin),
    );
    const dx = Math.round(clampedLeft - naturalLeft);
    setTooltipShift((prev) => (prev[idx] === dx ? prev : { ...prev, [idx]: dx }));
  }, []);

  // Пересчёт при изменении ширины окна (поворот экрана), пока тултип открыт
  useEffect(() => {
    if (activeIdx === null) return;
    const onResize = () => alignTooltip(activeIdx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIdx, alignTooltip]);

  // Выравниваем ВСЕ тултипы сразу после маунта (и при resize/загрузке шрифтов).
  // Скрытые (opacity-0) тултипы рендерятся всегда для hover-анимации, и если
  // вылезают за viewport, создают scrollable overflow — горизонтальный скролл
  // страницы на мобильных. Сдвиг должен применяться до первого взаимодействия.
  useEffect(() => {
    const alignAll = () => valid.forEach((_, idx) => alignTooltip(idx));
    alignAll();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(alignAll);
    };
    window.addEventListener("resize", onResize);
    // Шрифты меняют ширину кнопок/тултипов — пересчитываем после загрузки
    document.fonts?.ready.then(alignAll).catch(() => {});
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [valid, alignTooltip]);

  const handleToggle = (idx: number) => {
    if (activeIdx === idx) {
      setActiveIdx(null);
      return;
    }
    setActiveIdx(idx);
    alignTooltip(idx);
  };

  if (valid.length === 0) return null;

  return (
    <section className="relative bg-(--bp-surface-container-lowest) border-y border-primary/20 py-12">
      <div className="max-w-275 mx-auto px-4 md:px-5 relative z-40">
        <div className="text-center mb-10">
          <h2 className="bp-display text-white tracking-[0.2em] uppercase text-xl md:text-2xl mb-2">
            Погружение в контекст
          </h2>
          <div className="w-24 h-px bg-(--bp-primary) mx-auto" />
        </div>

        <div className="relative flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {/* Анимированная соединительная линия */}
          <svg
            aria-hidden
            className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 pointer-events-none z-0"
            preserveAspectRatio="none"
          >
            <line
              className="bp-connecting-line"
              stroke="rgba(255,183,135,0.3)"
              strokeWidth="2"
              x1="10%"
              x2="90%"
              y1="0"
              y2="0"
            />
          </svg>

          {valid.map((item, idx) => (
            <div
                key={idx}
                className="group relative flex justify-center z-40 bg-(--bp-surface-container-lowest) rounded-full p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  ref={(el) => { btnRefs.current.set(idx, el); }}
                  type="button"
                  aria-label={item.title}
                  aria-expanded={activeIdx === idx}
                  onMouseEnter={() => alignTooltip(idx)}
                  onClick={() => handleToggle(idx)}
                  className="bp-btn-pulse w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-primary/40 flex items-center justify-center text-(--bp-primary) hover:bg-(--bp-primary) hover:text-(--bp-background) transition-all duration-500 bg-(--bp-surface-container-lowest) shadow-[0_0_15px_rgba(255,183,135,0.2)] hover:shadow-[0_0_30px_rgba(255,183,135,0.5)]"
                >
                  <span className="ms-icon text-2xl md:text-3xl">{item.icon}</span>
                </button>
                {/* Тултип строго над иконкой: hover (десктоп) или тап (touch) */}
                <div
                  ref={(el) => { tipRefs.current.set(idx, el); }}
                  className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 max-w-[calc(100vw-2rem)] p-4 bg-(--bp-surface-container-high) border border-primary/30 rounded-xl shadow-2xl z-100 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out ${
                    activeIdx === idx
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : ""
                  }`}
                  style={{
                    transform:
                      tooltipShift[idx] !== undefined
                        ? `translateX(${tooltipShift[idx]}px)`
                        : undefined,
                  }}
                >
                <p className="bp-label-caps bp-tip-title text-(--bp-primary) mb-2 tracking-widest uppercase wrap-break-word [hyphens:auto]">
                  {item.title}
                </p>
                <p className="text-xs md:text-sm text-white/90 leading-relaxed wrap-break-word [hyphens:auto]">{item.text}</p>
                {/* Стрелочка тултипа: сдвигаем обратно, чтобы оставалась над иконкой */}
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-(--bp-surface-container-high)"
                  style={{
                    transform:
                      tooltipShift[idx] !== undefined
                        ? `translateX(${-tooltipShift[idx]}px)`
                        : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}