"use client"

import { useLayoutEffect, useRef } from "react"
import type React from "react"
import { useInView } from "motion/react"

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket"

interface HighlighterProps {
  children: React.ReactNode
  action?: AnnotationAction
  color?: string
  strokeWidth?: number
  animationDuration?: number
  iterations?: number
  padding?: number
  multiline?: boolean
  isView?: boolean
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null)

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  })

  // If isView is false, always show. If isView is true, wait for inView
  const shouldShow = !isView || isInView

  useLayoutEffect(() => {
    const element = elementRef.current
    let resizeObserver: ResizeObserver | null = null
    let cleanup: (() => void) | null = null

    if (shouldShow && element) {
      const annotationConfig = {
        type: action,
        color,
        strokeWidth,
        animationDuration,
        iterations,
        padding,
        multiline,
      }

      // Динамический импорт rough-notation — не грузим в основном бандле
      import("rough-notation").then(({ annotate }) => {
        const annotation = annotate(element, annotationConfig)
        annotation.show()

        resizeObserver = new ResizeObserver(() => {
          annotation.hide()
          annotation.show()
        })

        resizeObserver.observe(element)
        resizeObserver.observe(document.body)

        cleanup = () => {
          annotation.remove()
          if (resizeObserver) {
            resizeObserver.disconnect()
          }
        }
      }).catch(() => {
        // Если rough-notation не загрузился — просто показываем без анимации
      })
    }

    return () => {
      cleanup?.()
    }
  }, [
    shouldShow,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
  ])

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  )
}
