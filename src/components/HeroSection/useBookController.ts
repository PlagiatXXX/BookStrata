import {
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion"
import type { RefObject } from "react"

export function useBookController(containerRef: RefObject<HTMLElement | null>) {
  /* ================= SCROLL BASE ROTATION ================= */

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  // Вращение по оси Y (слева направо)
  const baseRotateY = useTransform(
    scrollYProgress,
    [0, 1],
    [-220, 100],
    { clamp: true }
  )

  // Вращение по оси X (наклон вверх/вниз) - для показа толщины книги
  // 25° начальный наклон показывает страницы и корешок
  const baseRotateX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [25, 10, 35],
    { clamp: true }
  )

  const baseRotateYSpring = useSpring(baseRotateY, {
    stiffness: 120,
    damping: 30,
  })

  const baseRotateXSpring = useSpring(baseRotateX, {
    stiffness: 100,
    damping: 25,
  })

  /* ================= POINTER ================= */

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)

  const hoverRotateX = useSpring(pointerY, {
    stiffness: 180,
    damping: 22,
  })

  const hoverRotateY = useSpring(pointerX, {
    stiffness: 180,
    damping: 22,
  })

  /* ================= OPEN STATE ================= */

  const open = useMotionValue(0)

  const openSpring = useSpring(open, {
    stiffness: 70,
    damping: 100,
  })

  /* ================= SCENE ROTATION ================= */

  // Hover работает только когда книга открывается
  const hoverInfluence = useTransform(openSpring, [0, 0.3], [0, 1])

  const rotateY = useTransform(
    [baseRotateYSpring, hoverRotateY, hoverInfluence],
    (values) => {
      const [base, hover, influence] = values as [
        number,
        number,
        number
      ]
      return base + hover * influence
    }
  )

  // Добавляем базовое вращение по X к hover эффекту
  const rotateX = useTransform(
    [baseRotateXSpring, hoverRotateX, hoverInfluence],
    (values) => {
      const [base, hover, influence] = values as [number, number, number]
      return base + hover * influence
    }
  )

  /* ================= INTERNAL ROTATIONS ================= */

  // Обложка — тяжёлая
  const coverRotateY = useTransform(openSpring, [0, 1], [0, -180])

  // Страницы — раскрываются чуть позже
  // firstPage — это внутренняя сторона обложки, переворачивается вместе с ней
  const page1RotateY = useTransform(openSpring, [0.1, 1], [0, -170])
  // secondPage — это правая страница, остаётся на месте (не вращается)
  const page2RotateY = useTransform(openSpring, [0, 1], [0, 0])

  return {
    rotateX,
    rotateY,
    coverRotateY,
    page1RotateY,
    page2RotateY,
    pointerX,
    pointerY,
    open,
  }
}