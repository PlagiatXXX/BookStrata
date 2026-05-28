import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function BookstrataCharacter() {
  const [isWatching, setIsWatching] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setIsWatching(true)
      const resetTimeout = setTimeout(() => {
        setIsWatching(false)
      }, 2500)
      return () => clearTimeout(resetTimeout)
    }, 1000)

    return () => clearTimeout(startTimeout)
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* Тело (голова вырезана) */}
      <img
        src="/bookstrata-body.png"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />

      {/* Голова (анимированный поворот) */}
      <motion.img
        src="/bookstrata-head.webp"
        alt=""
        className="absolute"
        style={{
          left: `${655 / 1536 * 100}%`,
          top: `${60 / 1024 * 100}%`,
          width: `${220 / 1536 * 100}%`,
          height: `${230 / 1024 * 100}%`,
        }}
        animate={{
          rotateY: isWatching ? 18 : 0,
        }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        draggable={false}
      />
    </div>
  )
}
