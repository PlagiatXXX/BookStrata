import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { Spinner } from "@/components/Spinner";

/**
 * Маршрут только для неавторизованных пользователей.
 *
 * Используется как layout-компонент в React Router v6+:
 * - Отображает Spinner во время загрузки
 * - Перенаправляет на redirect (или /dashboard) если авторизован
 * - Рендерит дочерние маршруты через Outlet
 */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo || "/dashboard"} replace />;
  }

  return <Outlet />;
}
