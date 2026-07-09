import { useRef, useState, useEffect, type ReactNode } from "react"

interface RevealBoxProps {
  children: ReactNode
  className?: string
}

export function RevealBox({ children, className = "" }: RevealBoxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const el = ref.current
    if (!el || isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible])

  return (
    <div
      ref={ref}
      className={`reveal-box ${isVisible ? "reveal--visible" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
