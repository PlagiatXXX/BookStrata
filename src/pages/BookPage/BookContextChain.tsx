// src/pages/BookPage/BookContextChain.tsx
// «Погружение в контекст» — интерактивная цепочка иконок (редакторский
// контент Book.contextChain): при наведении — анимированный тултип строго
// над иконкой, свечение активного звена, анимированная линия связи.
// Рендерится только при непустом contextChain (проверка в BookPage).
import type { BookContextChainItem } from "@/lib/bookApi";

interface BookContextChainProps {
  items: BookContextChainItem[];
}

export function BookContextChain({ items }: BookContextChainProps) {
  // Фильтруем невалидные элементы (защита от мусора в JSON из админки)
  const valid = items.filter(
    (i) => i && typeof i.icon === "string" && i.icon && i.title && i.text,
  );
  if (valid.length === 0) return null;

  return (
    <section className="relative bg-[var(--bp-surface-container-lowest)] border-y border-primary/20 py-12 overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-4 md:px-5 relative z-10">
        <div className="text-center mb-10">
          <h2 className="bp-display text-white tracking-[0.2em] uppercase text-xl md:text-2xl mb-2">
            Погружение в контекст
          </h2>
          <div className="w-24 h-px bg-[var(--bp-primary)] mx-auto" />
        </div>

        <div className="relative flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {/* Анимированная соединительная линия (десктоп) */}
          <svg
            aria-hidden
            className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 pointer-events-none hidden md:block z-0"
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
            <div key={idx} className="group relative flex justify-center z-10 bg-[var(--bp-surface-container-lowest)] rounded-full p-2">
              <button
                type="button"
                aria-label={item.title}
                className="bp-btn-pulse w-16 h-16 rounded-full border-2 border-primary/40 flex items-center justify-center text-[var(--bp-primary)] hover:bg-[var(--bp-primary)] hover:text-[var(--bp-background)] transition-all duration-500 bg-[var(--bp-surface-container-lowest)] shadow-[0_0_15px_rgba(255,183,135,0.2)] hover:shadow-[0_0_30px_rgba(255,183,135,0.5)]"
              >
                <span className="ms-icon text-3xl">{item.icon}</span>
              </button>
              {/* Тултип строго над иконкой */}
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 p-4 bg-[var(--bp-surface-container-high)] border border-primary/30 rounded-xl shadow-2xl backdrop-blur-xl z-50 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out">
                <p className="bp-label-caps text-[var(--bp-primary)] mb-2 tracking-widest uppercase">
                  {item.title}
                </p>
                <p className="text-sm text-white/90 leading-relaxed">{item.text}</p>
                {/* Стрелочка тултипа */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[var(--bp-surface-container-high)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}