import { Component, type ReactNode, type ErrorInfo } from "react";
import { FallbackErrorPage } from "./FallbackErrorPage";
import {
  isChunkLoadError,
  getReloadCount,
  incrementReloadCount,
} from "@/lib/lazy";

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
    // ========== Защита от stale-бандла и битого кеша ==========
    // lazy-обёртка (в lib/lazy.ts) уже делает 2 попытки восстановления.
    // Если ошибка дошла до boundary — пробуем ещё через cache-busting.
    // Всего до 4 попыток, затем FallbackErrorPage.

    const count = getReloadCount();

    if (isChunkLoadError(error) && count < 4) {
      incrementReloadCount();
      if (count === 0) {
        // Первая попытка — обычный reload
        window.location.reload();
      } else {
        // Последующие — cache-busting (???bust=<timestamp>)
        const cacheBust = `__bust=${Date.now()}`;
        const url = window.location.href;
        window.location.href = url.includes("?")
          ? `${url}&${cacheBust}`
          : `${url}?${cacheBust}`;
      }
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
