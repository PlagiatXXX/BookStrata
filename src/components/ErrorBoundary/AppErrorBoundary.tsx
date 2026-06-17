import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { FallbackErrorPage } from "./FallbackErrorPage";
import { isChunkLoadError, hasReloadedThisSession, markReloaded } from "@/lib/lazy";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

/**
 * Глобальный Error Boundary для всего приложения.
 * Ловит неожиданные падения React-компонентов и показывает
 * пользователю понятную заглушку.
 *
 * Используем class-компонент, потому что Error Boundary
 * может быть только классом.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, eventId: null };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, eventId: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Запасной слой защиты от stale-бандла:
    // если ошибка загрузки чанка дошла до boundary (lazy-обёртка её не поймала
    // или reload уже выполнялся в этой сессии) — пытаемся перезагрузить страницу.
    // reload ещё не было → перезагружаем и не логируем в Sentry (ошибка авто-восстановимая).
    // reload уже был → НЕ перезагружаем (защита от цикла), падаем в FallbackErrorPage
    // и логируем в Sentry как диагностическую ошибку.
    if (isChunkLoadError(error) && !hasReloadedThisSession()) {
      markReloaded();
      window.location.reload();
      return;
    }

    // Отправляем в Sentry (ленивая загрузка — ~450 KB)
    import("@sentry/browser").then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setExtras({ componentStack: errorInfo.componentStack ?? "" });
        const eventId = Sentry.captureException(error);
        this.setState({ eventId });
      });
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <FallbackErrorPage
          error={new Error("Произошла непредвиденная ошибка")}
          componentStack={null}
          eventId={this.state.eventId}
          resetError={() => {
            this.setState({ hasError: false, eventId: null });
            window.location.href = "/";
          }}
        />
      );
    }

    return this.props.children;
  }
}
