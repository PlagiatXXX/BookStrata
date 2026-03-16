import {
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import type { RefObject } from "react";

import { MotionValue } from "framer-motion";

interface BookControllerReturn {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  coverTransform: MotionValue<string>;
  firstPageTransform: MotionValue<string>;
  secondPageTransform: MotionValue<string>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  open: MotionValue<number>;
}

export function useBookController(containerRef: RefObject<HTMLElement | null>): BookControllerReturn {
  /* ================= SCROLL BASE ROTATION ================= */

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Вращение по оси Y (слева направо)
  const baseRotateY = useTransform(scrollYProgress, [0, 1], [-140, 40], {
    clamp: true,
  });

  // Вращение по оси X (наклон вверх/вниз) - для показа толщины книги
  // 25° начальный наклон показывает страницы и корешок
  const baseRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [18, 8, 24], {
    clamp: true,
  });

  const baseRotateYSpring = useSpring(baseRotateY, {
    stiffness: 120,
    damping: 30,
  });

  const baseRotateXSpring = useSpring(baseRotateX, {
    stiffness: 100,
    damping: 25,
  });

  /* ================= POINTER ================= */

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Уменьшил чувствительность с 18° до 12° — книга тяжелее и реалистичнее
  const hoverRotateX = useSpring(pointerY, {
    stiffness: 160,
    damping: 28,
  });

  const hoverRotateY = useSpring(pointerX, {
    stiffness: 160,
    damping: 28,
  });

  /* ================= OPEN STATE ================= */

  const open = useMotionValue(0);

  const openSpring = useSpring(open, {
    stiffness: 90,
    damping: 22,
  });

  /* ================= SCENE ROTATION ================= */

  // Hover работает только когда книга открывается
  const hoverInfluence = useTransform(openSpring, [0.4, 1], [0, 1]);

  const rotateY = useTransform(
    [baseRotateYSpring, hoverRotateY, hoverInfluence] as const,
    ([base, hover, influence]) => {
      const typedValues = [base, hover, influence] as [number, number, number];
      const [typedBase, typedHover, typedInfluence] = typedValues;
      
      const combined = typedBase + typedHover * typedInfluence;
      // Ограничиваем экстремальные углы (-160° до 60°)
      return Math.max(-160, Math.min(60, combined));
    },
  );

  // Добавляем базовое вращение по X к hover эффекту
  const rotateX = useTransform(
    [baseRotateXSpring, hoverRotateX, hoverInfluence] as const,
    ([base, hover, influence]) => {
      const typedValues = [base, hover, influence] as [number, number, number];
      const [typedBase, typedHover, typedInfluence] = typedValues;
      
      const combined = typedBase + typedHover * typedInfluence;
      // Ограничиваем наклон (0° до 45°)
      return Math.max(0, Math.min(45, combined));
    },
  );

  /* ================= INTERNAL ROTATIONS ================= */

  // Обложка — тяжёлая
  const coverRotateY = useTransform(openSpring, [0, 1], [0, -178]);

  // Страницы — раскрываются чуть позже
  // firstPage — это внутренняя сторона обложки, переворачивается вместе с ней
  const page1RotateY = useTransform(openSpring, [0.1, 1], [0, -160]);
  // secondPage — это правая страница, остаётся на месте (не вращается)
  const page2RotateY = useTransform(openSpring, [0, 1], [0, 0]);

  /* ================= TRANSFORM STRINGS ================= */

  // Transform-строки для CSS (глубина + вращение)
  const coverTransform = useTransform(
    coverRotateY,
    (v) => `translateZ(calc(var(--depth)/2 + 6px)) rotateY(${v}deg)`,
  );

  // Левая страница — сдвинута к центру для устранения щели
  const firstPageTransform = useTransform(
    page1RotateY,
    (v) => `translateZ(calc(var(--depth)/2 - 11px)) rotateY(${v}deg)`,
  );

  // Правая страница — фиксированная
  const secondPageTransform = useTransform(
    page2RotateY,
    (v) => `translateZ(calc(var(--depth)/2 - 11px)) rotateY(${v}deg)`,
  );

  return {
    rotateX,
    rotateY,
    coverTransform,
    firstPageTransform,
    secondPageTransform,
    pointerX,
    pointerY,
    open,
  };
}
