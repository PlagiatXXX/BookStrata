import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthForm } from "@/components/AuthForm/AuthForm";

export function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return <AuthForm />;
}
