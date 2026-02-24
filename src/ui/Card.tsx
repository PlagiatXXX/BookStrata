import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 light:bg-white rounded-lg shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
