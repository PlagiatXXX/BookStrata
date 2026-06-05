"use client"

import { useEffect, useRef } from "react"
import rough from "roughjs"

interface HanddrawnSmileyProps {
  className?: string
  size?: number
}

export function HanddrawnSmiley({ className = "", size = 80 }: HanddrawnSmileyProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    svg.innerHTML = ""
    const rc = rough.svg(svg)
    const s = svg

    const cx = size / 2
    const cy = size / 2
    const r = size * 0.38
    const strokeWidth = 1.8
    const color = "#c97d60"
    const fill = "transparent"
    const options = {
      stroke: color,
      strokeWidth,
      roughness: 1.8,
      fill,
      bowing: 0.6,
    }

    // Голова — неровный круг
    const head = rc.circle(cx, cy, r * 2, {
      ...options,
      roughness: 2.2,
    })
    s.appendChild(head)

    // Глаза — два X
    const eyeHalf = size * 0.04
    const eyeY = cy - r * 0.25
    const eyeOffsetX = r * 0.32

    function drawX(ex: number, ey: number, half: number) {
      // top-left → bottom-right
      s.appendChild(
        rc.line(ex - half, ey - half, ex + half, ey + half, {
          ...options,
          roughness: 1.5,
          strokeWidth: 2.4,
        }),
      )
      // top-right → bottom-left
      s.appendChild(
        rc.line(ex + half, ey - half, ex - half, ey + half, {
          ...options,
          roughness: 1.5,
          strokeWidth: 2.4,
        }),
      )
    }

    drawX(cx - eyeOffsetX, eyeY, eyeHalf)
    drawX(cx + eyeOffsetX, eyeY, eyeHalf)

    // Рот — простая линия чуть на боку
    const mouthY = cy + r * 0.22
    const mouthLen = r * 0.4
    const tilt = r * 0.06
    const mouth = rc.line(
      cx - mouthLen, mouthY - tilt,
      cx + mouthLen, mouthY + tilt,
      { ...options, roughness: 1.5, strokeWidth: 2 },
    )
    s.appendChild(mouth)
  }, [size])

  return (
    <svg
      ref={svgRef}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    />
  )
}
