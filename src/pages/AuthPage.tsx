import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthForm } from "@/components/AuthForm/AuthForm";
import { SEOHead } from "@/components/SEO/SEOHead";

export function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <>
        <SEOHead title="Вход и регистрация" url="/auth" noindex />
        <div className="min-h-screen flex items-center justify-center">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Вход и регистрация" description="Войдите или зарегистрируйтесь в BookStrata — социальной сети для читателей." url="/auth" noindex />
      <AuthForm />
    </>
  );
}
