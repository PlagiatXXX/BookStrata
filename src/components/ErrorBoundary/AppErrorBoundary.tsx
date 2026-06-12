import React, { Component, type ReactNode, type ErrorInfo } from "react";
import * as Sentry from "@sentry/browser";
import { FallbackErrorPage } from "./FallbackErrorPage";

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
    // Отправляем в Sentry
    Sentry.withScope((scope) => {
      scope.setExtras({ componentStack: errorInfo.componentStack ?? "" });
      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
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
