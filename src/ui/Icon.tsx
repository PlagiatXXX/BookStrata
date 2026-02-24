import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

interface IconProps {
  icon: ComponentType<LucideProps>;
  size?: number | string;
  className?: string;
  spin?: boolean;
}

export function Icon({ icon: IconComponent, size = "1em", className = "", spin = false }: IconProps) {
  const spinClass = spin ? "animate-spin" : "";
  return <IconComponent size={size} className={`inline-block ${spinClass} ${className}`} />;
}
