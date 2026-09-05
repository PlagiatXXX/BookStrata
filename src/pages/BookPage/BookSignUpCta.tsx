// src/pages/BookPage/BookSignUpCta.tsx
// Призыв к регистрации в конце страницы книги — виден только неавторизованным.
// Glass-панель с неоновым свечением, в стиле арт-деко (как BookComments).
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { Icon } from "@/components/Icon";

interface BookSignUpCtaProps {
  /** Куда вернуть после входа/регистрации */
  redirectTo: string;
}

export function BookSignUpCta({ redirectTo }: BookSignUpCtaProps) {
  const { user } = useAuth();

  // Авторизованным CTA не показываем
  if (user) return null;

  const redirect = encodeURIComponent(redirectTo);

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Фоновый градиент */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bp-primary)]/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-[700px] mx-auto px-4 md:px-5">
        <div className="bp-glass-panel p-8 md:p-10 rounded-2xl border border-[var(--bp-primary)]/20 shadow-[0_0_40px_rgba(255,183,135,0.08)] text-center relative overflow-hidden">
          {/* Декоративные углы (арт-деко) */}
          <div aria-hidden className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[var(--bp-primary)]/40" />
          <div aria-hidden className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[var(--bp-primary)]/40" />
          <div aria-hidden className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[var(--bp-primary)]/40" />
          <div aria-hidden className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[var(--bp-primary)]/40" />

          {/* Иконка */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--bp-primary)]/10 border border-[var(--bp-primary)]/30 flex items-center justify-center">
            <Icon name="person_add" className="text-[var(--bp-primary)] text-3xl" />
          </div>

          <h2 className="bp-display text-white text-xl md:text-2xl mb-3 drop-shadow-lg">
            Присоединяйтесь к BookStrata
          </h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-md mx-auto">
            Оценивайте книги, составляйте тир-листы, делитесь впечатлениями
            с единомышленниками
          </p>

          {/* Кнопки */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to={`/auth?mode=register&redirect=${redirect}`}
              className="inline-flex items-center gap-2 bg-[var(--bp-primary)] hover:bg-[var(--bp-primary-container)] text-[var(--bp-on-primary)] bp-label-caps px-7 py-3 rounded-lg shadow-[0_0_20px_rgba(255,183,135,0.3)] hover:shadow-[0_0_30px_rgba(255,183,135,0.5)] transition-all"
            >
              <Icon name="person_add" className="text-sm" />
              Создать аккаунт
            </Link>
            <Link
              to={`/auth?mode=login&redirect=${redirect}`}
              className="bp-label-caps text-white/50 hover:text-white transition-colors tracking-widest text-sm"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
