import { AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";

interface EditorErrorScreenProps {
  error: Error | unknown;
  onMyRatingsClick: () => void;
  onRetry?: () => void;
}

export function EditorErrorScreen({
  error,
  onMyRatingsClick,
}: EditorErrorScreenProps) {
  const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";

  return (
    <DashboardLayout
      onMyRatingsClick={onMyRatingsClick}
      onSearch={() => {}}
      searchValue=""
    >
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <AlertCircle size={56} className="text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Ошибка загрузки</h2>
          <p className="text-gray-300 mb-6">
            {errorMessage}
          </p>
          <button
            onClick={() => onMyRatingsClick()}
            className="px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Вернуться в панель управления
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
