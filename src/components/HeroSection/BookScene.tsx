import { motion } from "framer-motion"
import { useRef, useCallback, type RefObject } from "react"
import { useBookController } from "./useBookController"
import "./BookScene.css"

interface BookSceneProps {
  containerRef: RefObject<HTMLDivElement | null>
}

export default function BookScene({ containerRef }: BookSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  const {
    rotateX,
    rotateY,
    coverRotateY,
    page1RotateY,
    page2RotateY,
    pointerX,
    pointerY,
    open,
  } = useBookController(containerRef)

 const handleEnter = useCallback(() => {
    open.set(1)
  }, [open])

  const handleLeave = useCallback(() => {
    open.set(0)
    pointerX.set(0)
    pointerY.set(0)
  }, [open, pointerX, pointerY])

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (open.get() !== 1) return
      if (!rootRef.current) return

      const rect = rootRef.current.getBoundingClientRect()

      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height

      pointerX.set((px - 0.5) * 18)
      pointerY.set(-(py - 0.5) * 18)
    },
    [pointerX, pointerY, open]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        const next = open.get() === 0 ? 1 : 0
        open.set(next)

        if (next === 0) {
          pointerX.set(0)
          pointerY.set(0)
        }
      }
    },
    [open, pointerX, pointerY]
  )

  const isOpen = open.get() === 1

  return (
    <div
      ref={rootRef}
      className="book-root"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isOpen}
      aria-label="Интерактивная 3D книга"
    >
      <motion.div
        className="book-scene"
        style={{ rotateX, rotateY }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="book">
          {/* Задняя обложка */}
          <div className="backCover" />
          
          {/* Корешок */}
          <div className="spine" />
          
          {/* Стопка страниц (фон) */}
          <div className="pagesStack" />
          
          {/* Толщина страниц (сбоку) */}
          <div className="pagesThickness" />

          {/* Левая страница (внутренняя сторона обложки) */}
          <motion.div
            className="firstPage"
            style={{ rotateY: page1RotateY }}
          />

          {/* Правая страница с цитатой */}
          <motion.div
            className="secondPage"
            style={{ rotateY: page2RotateY }}
          >
            <div className="quote">
              <span className="quote-drop-cap">З</span>
              нание это сила, но приоритет это направление.
            </div>
            <div className="pageNumber">12</div>
          </motion.div>

          {/* Передняя обложка */}
          <motion.div
            className="frontCover"
            style={{ rotateY: coverRotateY }}
          >
            <div className="cover-title">BookStrata</div>
            <div className="cover-subtitle">PRO</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
