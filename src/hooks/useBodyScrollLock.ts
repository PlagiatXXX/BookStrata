import { useEffect } from "react"

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const html = document.documentElement
    const body = document.body

    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    const prevBodyPosition = body.style.position
    const prevBodyWidth = body.style.width

    // Блокируем скролл на html и body (некоторые браузеры скроллят html)
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    // Фиксируем body чтобы не было jump при скрытии скроллбара
    body.style.position = "relative"
    body.style.width = "100%"

    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
      body.style.position = prevBodyPosition
      body.style.width = prevBodyWidth
    }
  }, [locked])
}
