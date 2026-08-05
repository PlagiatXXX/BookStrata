import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface RevealProps {
  /** Тег корневого элемента (по умолчанию div) */
  as?: "div" | "section";
  className?: string;
  id?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Reveal — плавное появление элемента при попадании во вьюпорт.
 *
 * Наблюдает СВОЙ собственный DOM-узел через IntersectionObserver,
 * поэтому работает независимо от того, когда элемент смонтировался
 * (lazy-чанки, загрузка данных) — в отличие от старого паттерна
 * «data-reveal + глобальный querySelector», когда элементы, появившиеся
 * после подписки observer'а, навсегда оставались скрытыми (opacity: 0).
 *
 * Стили: .reveal / .reveal--visible (см. src/styles/globals.css).
 *
 * Если нужен ref на корневой элемент — оберни <Reveal> вокруг своего
 * тега (например, <Reveal><section ref={...}>...</section></Reveal>).
 */
export function Reveal({
  as = "div",
  className = "",
  id,
  style,
  children,
}: RevealProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  // При prefers-reduced-motion показываем сразу, без анимации
  const [visible, setVisible] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = nodeRef.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  const Tag = as;

  return (
    <Tag
      ref={nodeRef}
      id={id}
      style={style}
      className={`${className} reveal${visible ? " reveal--visible" : ""}`.trim()}
    >
      {children}
    </Tag>
  );
}