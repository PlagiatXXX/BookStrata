import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();

  console.log("[AdminGuard] isLoading:", isLoading, "user:", user);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--accent-main)" />
      </div>
    );
  }

  if (!user) {
    console.log("[AdminGuard] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Проверка роли пользователя (только admin и moderator)
  console.log("[AdminGuard] user.role:", user.role);
  if (user.role !== "admin" && user.role !== "moderator") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-(--ink-0) mb-2">
            Доступ запрещён
          </h1>
          <p className="text-(--ink-1)">
            У вас нет прав для доступа к этой странице
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
