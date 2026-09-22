import { Link } from "react-router-dom";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  theme?: "dark" | "light";
}

/**
 * Inline-стили гарантируют видимость кроумбов поверх CSS-переменных темы
 * (.neo-brutalist-editor задаёт color: var(--theme-text), что может
 * перебивать Tailwind-утилиты из-за порядка слоёв).
 */
export function Breadcrumbs({ items, theme = "dark" }: BreadcrumbsProps) {
  if (!items.length) return null;

  const isLight = theme === "light";

  return (
    <nav aria-label="Хлебные крошки" className="mb-6">
      <ol
        className="flex items-center flex-wrap gap-y-1 text-xs"
        style={{ color: isLight ? "#64748b" : "var(--ink-2)" }}
      >
        {items.map((item, i) => (
          <li key={i} className="flex items-center">
            {i > 0 && (
              <span className="mx-2 select-none" style={{ color: isLight ? "#cbd5e1" : "var(--ink-2)" }} aria-hidden="true">/</span>
            )}
            {item.href ? (
              <Link
                to={item.href}
                className="transition-colors hover:!text-orange-600"
                style={{ color: isLight ? "#64748b" : "var(--ink-2)" }}
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium" style={{ color: isLight ? "#0f172a" : "var(--ink-0)" }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
