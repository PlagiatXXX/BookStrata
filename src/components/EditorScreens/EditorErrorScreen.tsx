import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { ApiRequestError } from "@/lib/api-client";

interface EditorErrorScreenProps {
  error: Error | unknown;
  onMyRatingsClick: () => void;
  onRetry?: () => void;
}

export function EditorErrorScreen({
  error,
  onMyRatingsClick,
  onRetry,
}: EditorErrorScreenProps) {
  const isApiError = error instanceof ApiRequestError;
  const status = isApiError ? error.status : (error as { status?: number })?.status;
  const code = isApiError ? error.code : (error as { code?: string })?.code;
  const rawMessage = error instanceof Error ? error.message : "Неизвестная ошибка";

  const isForbidden =
    status === 403 ||
    code === "ACCESS_DENIED" ||
    rawMessage.includes("приватным") ||
    rawMessage.includes("Доступ ограничен");

  const isNotFound =
    status === 404 ||
    code === "NOT_FOUND" ||
    code === "TIER_LIST_NOT_FOUND" ||
    rawMessage.includes("не найден");

  let title = "Ошибка загрузки";
  let description = rawMessage;

  if (isForbidden) {
    title = "Приватный тир-лист";
    description =
      "Автор ограничил доступ к этому тир-листу. Если это ваш список, пожалуйста, войдите в свой аккаунт.";
  } else if (isNotFound) {
    title = "Тир-лист не найден";
    description = "Запрашиваемый список не найден или был удалён.";
  }

  return (
    <DashboardLayout
      onMyRatingsClick={onMyRatingsClick}
      onSearch={() => {}}
      searchValue=""
    >
      <div className="flex items-center justify-center min-h-[60vh] py-12 px-4">
        <div className="text-center max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
          <div className="mb-6">
            <img src="/lap.webp" alt="" className="size-16 object-contain mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Попробовать снова
              </button>
            )}
            <Link
              to="/"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              На главную
            </Link>
            <button
              type="button"
              onClick={onMyRatingsClick}
              className="px-5 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Мои тир-листы
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
