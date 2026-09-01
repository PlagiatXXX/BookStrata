import type { ReactNode } from "react";

interface ThemeContentGridProps {
  children: ReactNode;
}

export function ThemeContentGrid({ children }: ThemeContentGridProps) {
  return (
    <section className="py-8">
      {children}
    </section>
  );
}
