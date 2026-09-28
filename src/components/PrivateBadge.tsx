import { Lock } from "lucide-react";

/**
 * Пометка «Приватный» для тир-листа.
 * Видят все, кто вообще видит список: владелец, admin, moderator.
 */
export function PrivateBadge({ className }: { className?: string }) {
  return (
    <span
      data-testid="private-badge"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 ${className ?? ""}`}
    >
      <Lock size={11} aria-hidden />
      Приватный
    </span>
  );
}
