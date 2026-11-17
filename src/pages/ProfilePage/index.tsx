import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";

/**
 * `/profile` остаётся под ProtectedRoute и перенаправляет на единую страницу
 * профиля `/users/:id` (спека §5). Для неавторизованных сохраняем прежний
 * экран «войдите» — на случай прямого рендера компонента вне роутера.
 */
export default function ProfilePage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] dark:bg-[#0f0f1a] light:bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white dark:text-white light:text-gray-900 mb-4">
            Пожалуйста, войдите в систему
          </h1>
          <a href="/auth" className="text-primary hover:underline">
            Перейти на страницу входа
          </a>
        </div>
      </div>
    );
  }

  return <Navigate replace to={`/users/${user.userId}`} />;
}
