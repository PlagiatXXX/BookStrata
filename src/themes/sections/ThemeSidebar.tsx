import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import { useTheme } from "../useTheme";

interface ThemeSidebarProps {
  collectionSlug?: string;
  currentUserId?: number | null;
}

export function ThemeSidebar({ collectionSlug, currentUserId }: ThemeSidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleSave = useCallback(() => {
    if (!currentUserId) {
      sileo.action({
        title: "Сохраните свою версию",
        description: "Зарегистрируйтесь, чтобы создать свой рейтинг и сохранить его в личной библиотеке.",
        duration: 10000,
        button: {
          title: "Создать аккаунт",
          onClick: () =>
            navigate(
              `/auth?mode=register&redirect=${encodeURIComponent(`/collections/${collectionSlug}`)}`,
            ),
        },
      });
      return;
    }
    window.location.href = `/tier-lists/new?fork=${collectionSlug}`;
  }, [currentUserId, navigate, collectionSlug]);

  if (!theme?.sidebar) return null;

  const { sidebar } = theme;

  return (
    <div
      className="sticky top-24 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, var(--theme-surface) 0%, rgba(134, 69, 42, 0.06) 100%)",
        border: "1px solid var(--theme-outline-variant)",
        boxShadow: "0 4px 20px rgba(134, 69, 42, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header with decorative accent */}
      <div
        className="px-6 py-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(134, 69, 42, 0.08) 0%, rgba(134, 69, 42, 0.03) 100%)",
          borderBottom: "1px solid var(--theme-outline-variant)",
        }}
      >
        {/* Small decorative leaf */}
        <svg
          className="absolute top-2 right-2 opacity-[0.08] w-12 h-12"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M50 5 C60 20, 85 30, 90 55 C95 75, 75 95, 50 95 C25 95, 5 75, 10 55 C15 30, 40 20, 50 5Z"
            fill="var(--theme-primary)"
          />
        </svg>

        <h4
          className="text-xl mb-1 relative z-10"
          style={{
            fontFamily: "var(--theme-font-headline)",
            color: "var(--theme-ink)",
            fontWeight: 600,
          }}
        >
          {sidebar.title}
        </h4>
      </div>

      <div className="px-6 py-5">
        <p
          className="text-sm mb-5 leading-relaxed"
          style={{
            fontFamily: "var(--theme-font-body)",
            color: "var(--theme-on-surface-variant)",
          }}
        >
          {sidebar.description}
        </p>

        <div className="space-y-3.5">
          {sidebar.items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--theme-secondary-container) 0%, rgba(73, 100, 85, 0.15) 100%)",
                  color: "var(--theme-on-secondary-container)",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              </div>
              <span
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--theme-font-label)",
                  color: "var(--theme-on-surface)",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {sidebar.cta && (
          <button
            type="button"
            onClick={handleSave}
            className="w-full mt-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
            style={{
              fontFamily: "var(--theme-font-label)",
              background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-container) 100%)",
              color: "var(--theme-parchment)",
              boxShadow: "0 2px 8px rgba(134, 69, 42, 0.3), 0 1px 3px rgba(134, 69, 42, 0.2)",
              letterSpacing: "0.02em",
            }}
          >
            {sidebar.cta.label}
          </button>
        )}
      </div>
    </div>
  );
}
