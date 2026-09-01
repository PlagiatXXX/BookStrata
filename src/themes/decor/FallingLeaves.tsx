import { useMemo } from "react";
import { motion } from "framer-motion";

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

function generateLeaves(count: number): Leaf[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 12,
    size: 16 + Math.random() * 24,
    rotation: Math.random() * 360,
  }));
}

export function FallingLeaves() {
  const leaves = useMemo(() => generateLeaves(12), []);

  if (leaves.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 2 }}
    >
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute"
          style={{
            left: `${leaf.x}%`,
            top: "-40px",
            fontSize: `${leaf.size}px`,
            color: "#c97d3a",
            opacity: 0.35,
            filter: "blur(0.5px)",
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, Math.sin(leaf.id) * 60, 0],
            rotate: [leaf.rotation, leaf.rotation + 360],
            opacity: [0.35, 0.45, 0.35],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          🍂
        </motion.div>
      ))}
    </div>
  );
}
