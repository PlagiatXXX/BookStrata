import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Единый контейнер для страниц — занимает всю ширину родителя.
 * Каждая страница задаёт свои max-width и паддинги внутри.
 * Для страниц внутри DashboardLayout — обёртка встроена в сам DashboardLayout
 * (отключается через fullWidth).
 */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}
