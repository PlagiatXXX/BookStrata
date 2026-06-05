import React, { useEffect, useState } from "react"
import { cn } from "@/utils/cn"

interface MeteorsProps {
  number?: number
  minDelay?: number
  maxDelay?: number
  minDuration?: number
  maxDuration?: number
  angle?: number
  className?: string
}

export const Meteors = ({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>(
    []
  )

  useEffect(() => {
    const styles = [...new Array(number)].map(() => ({
      "--angle": `${-angle}deg`,
      top: "-5%",
      left: `${Math.random() * 100}%`,
      animationDelay: Math.random() * (maxDelay - minDelay) + minDelay + "s",
      animationDuration:
        Math.floor(Math.random() * (maxDuration - minDuration) + minDuration) +
        "s",
    }))
    setMeteorStyles(styles)
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle])

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          style={{ ...style }}
          className={cn(
            "animate-meteor pointer-events-none absolute size-0.5 rounded-full bg-cyan-200 shadow-[0_0_8px_3px_rgba(103,232,249,0.5)]",
            className
          )}
        >
          <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-20 -translate-y-1/2 bg-linear-to-l from-cyan-300/80 to-transparent" style={{ right: '100%' }} />
        </span>
      ))}
    </>
  )
}
