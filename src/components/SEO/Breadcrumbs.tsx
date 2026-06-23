import { Link } from "react-router-dom";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  theme?: "dark" | "light";
}

export function Breadcrumbs({ items, theme = "dark" }: BreadcrumbsProps) {
  if (!items.length) return null;

  const linkColor = theme === "light"
    ? "text-slate-500 hover:text-orange-600"
    : "text-(--ink-2) hover:text-(--accent-main)";

  const activeColor = theme === "light"
    ? "text-slate-900 font-medium"
    : "text-(--ink-0) font-medium";

  const separatorColor = theme === "light"
    ? "text-slate-300"
    : "text-(--ink-2)";

  const separatorEl = (
    <span className={`mx-2 select-none ${separatorColor}`} aria-hidden="true">/</span>
  );

  return (
    <nav aria-label="Хлебные крошки" className="mb-6">
      <ol className={`flex items-center flex-wrap text-xs ${theme === "light" ? "text-slate-500" : "text-(--ink-2)"}`}>
        {items.map((item, i) => (
          <li key={i} className="flex items-center">
            {i > 0 && separatorEl}
            {item.href ? (
              <Link to={item.href} className={`transition-colors ${linkColor}`}>
                {item.label}
              </Link>
            ) : (
              <span className={activeColor}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
