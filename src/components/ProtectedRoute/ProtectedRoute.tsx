import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { Spinner } from "@/components/Spinner";

/**
 * Защищённый маршрут для авторизованных пользователей.
 * 
 * Используется как layout-компонент в React Router v6+:
 * - Отображает Spinner во время загрузки
 * - Перенаправляет на /auth если не авторизован
 * - Рендерит дочерние маршруты через Outlet
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
