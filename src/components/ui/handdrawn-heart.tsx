"use client"

import { useEffect, useRef } from "react"

interface HanddrawnHeartProps {
  className?: string
  size?: number
  color?: string
}

export function HanddrawnHeart({ className = "", size = 20, color = "#f472b6" }: HanddrawnHeartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let cancelled = false

    import("roughjs").then((mod) => {
      const rough = mod.default || mod
      if (cancelled || !svg) return

      svg.innerHTML = ""
      const rc = rough.svg(svg)

      // Heart path as two cubic bezier curves
      const s = size
      const d = `M ${s * 0.5} ${s * 0.35} C ${s * 0.5} ${s * 0.2}, ${s * 0.1} ${s * 0.05}, ${s * 0.1} ${s * 0.35} C ${s * 0.1} ${s * 0.6}, ${s * 0.5} ${s * 0.85}, ${s * 0.5} ${s * 0.95} C ${s * 0.5} ${s * 0.85}, ${s * 0.9} ${s * 0.6}, ${s * 0.9} ${s * 0.35} C ${s * 0.9} ${s * 0.05}, ${s * 0.5} ${s * 0.2}, ${s * 0.5} ${s * 0.35} Z`

      const path = rc.path(d, {
        stroke: color,
        strokeWidth: 1.5,
        roughness: 1.8,
        bowing: 1,
      })
      svg.appendChild(path)
    }).catch(() => {})

    return () => {
      cancelled = true
    }
  }, [size, color])

  return (
    <svg
      ref={svgRef}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible", display: "inline-block", verticalAlign: "middle" }}
    />
  )
}
