// src/pages/BookPage/ContentLock.tsx
// Полный замок для неавторизованных: нижний контент страницы книги
// вообще не рендерится — вместо него затемнение на всю ширину экрана
// с цепью, замком и CTA регистрации. Авторизованным (и при пререндере)
// рендерится только children.
// SEO-safe: при пререндере (window.__PRERENDER__) блокировка не применяется,
// полный контент попадает в статический HTML.
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { Icon } from "@/components/Icon";

const isPrerendering =
  typeof window !== "undefined" && window.__PRERENDER__ === true;

/** Цепь с замком на всю ширину блока (чисто декоративный элемент) */
function ChainLock() {
  return (
    <div aria-hidden className="flex items-center w-full max-w-md">
      <span className="flex-1 border-t-2 border-dashed border-white/40" />
      <Icon name="link" className="text-white/40 text-base -rotate-45" />
      <Icon name="link" className="text-white/40 text-base rotate-45" />
      <Icon name="lock" className="text-[var(--bp-primary)] text-3xl mx-2 drop-shadow-[0_0_14px_rgba(255,183,135,0.6)]" />
      <Icon name="link" className="text-white/40 text-base rotate-45" />
      <Icon name="link" className="text-white/40 text-base -rotate-45" />
      <span className="flex-1 border-t-2 border-dashed border-white/40" />
    </div>
  );
}

/** Кнопки «Создать аккаунт» / «Войти» — с redirect на исходную страницу */
function RegisterCta({
  ctaLabel = "Создать аккаунт",
  redirectTo = "/",
}: {
  ctaLabel?: string;
  redirectTo?: string;
}) {
  const redirect = encodeURIComponent(redirectTo);
  return (
    <div className="flex items-center justify-center gap-5 flex-wrap">
      <Link
        to={`/auth?mode=register&redirect=${redirect}`}
        className="inline-flex items-center gap-2 bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] bp-label-caps px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(255,183,135,0.3)] hover:shadow-[0_0_30px_rgba(255,183,135,0.5)] transition-all"
      >
        <Icon name="person_add" className="text-sm" />
        {ctaLabel}
      </Link>
      <Link
        to={`/auth?mode=login&redirect=${redirect}`}
        className="bp-label-caps text-white/60 hover:text-white transition-colors tracking-widest"
      >
        Войти
      </Link>
    </div>
  );
}

interface ContentLockProps {
  children: ReactNode;
  description: string;
  ctaLabel?: string;
  /** Куда вернуть после входа/регистрации */
  redirectTo?: string;
}

export function ContentLock({
  children,
  description,
  ctaLabel = "Создать аккаунт",
  redirectTo = "/",
}: ContentLockProps) {
  const { user } = useAuth();
  const locked = !user && !isPrerendering;

  if (!locked) return <>{children}</>;

  return (
    <section className="relative">
      {/* Затемнение на всю ширину экрана */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/75 to-black/95 pointer-events-none"
      />
      <div className="relative z-10 max-w-[1100px] mx-auto px-4 md:px-5 py-20 md:py-28 flex flex-col items-center gap-4">
        <ChainLock />
        <p className="text-white/80 text-sm md:text-base text-center leading-relaxed drop-shadow max-w-md">
          {description}
        </p>
        <RegisterCta ctaLabel={ctaLabel} redirectTo={redirectTo} />
      </div>
    </section>
  );
}