import * as Sentry from "@sentry/browser";

interface FallbackErrorPageProps {
  error: Error | unknown;
  componentStack: string | null;
  eventId: string | null;
  resetError(): void;
}

/**
 * Страница-заглушка при падении React-компонента.
 * Показывает пользователю понятную ошибку и кнопку «Попробовать снова».
 */
export function FallbackErrorPage({
  error,
  resetError,
}: FallbackErrorPageProps) {
  const errorMessage =
    error instanceof Error ? error.message : "Неизвестная ошибка";
  const errorStack = error instanceof Error ? error.stack : undefined;

  const handleReport = () => {
    Sentry.showReportDialog({
      eventId: Sentry.lastEventId(),
      title: "Что-то пошло не так",
      subtitle: "Наша команда уже уведомлена об ошибке.",
      subtitle2: "Если хотите помочь — опишите, что вы делали перед ошибкой.",
      labelName: "Имя (необязательно)",
      labelEmail: "Email (необязательно)",
      labelComments: "Что вы делали?",
      labelClose: "Закрыть",
      labelSubmit: "Отправить",
      errorGeneric: "Не удалось отправить отчёт.",
      errorFormEntry: "Пожалуйста, заполните все поля.",
      successMessage: "Спасибо! Мы разберёмся.",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="neo-brutalist-editor nb-modal max-w-md w-full text-center">
        <div className="space-y-4">
          <div className="text-6xl">💥</div>

          <h1 className="nb-display-lg text-2xl text-black">
            Что-то пошло не так
          </h1>

          <p className="text-sm text-gray-600">
            Произошла неожиданная ошибка. Мы уже получили уведомление
            и скоро всё починим.
          </p>

          {import.meta.env.DEV && (
            <details className="text-left">
              <summary className="cursor-pointer text-xs text-gray-400">
                Технические детали
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs text-red-600">
                {errorMessage}
                {"\n"}
                {errorStack}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                resetError();
                window.location.href = "/";
              }}
              className="nb-btn-primary w-full"
            >
              На главную
            </button>

            <button
              onClick={handleReport}
              className="nb-btn-secondary w-full"
            >
              Сообщить об ошибке
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
