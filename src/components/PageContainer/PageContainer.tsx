import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Единый контейнер для страниц — задаёт max-width, центрирование и
 * горизонтальные отступы. Все страницы, обёрнутые в PageContainer,
 * выглядят одинаково на любом экране.
 *
 * Использование:
 *   <PageContainer>
 *     <PageContent />
 *   </PageContainer>
 *
 * Для страниц без DashboardLayout — обернуть напрямую.
 * Для страниц внутри DashboardLayout — обёртка встроена в сам DashboardLayout
 * (отключается через fullWidth).
 */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl ${className}`}>
      {children}
    </div>
  );
}
