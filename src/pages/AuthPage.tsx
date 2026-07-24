import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { AuthForm } from "@/components/AuthForm/AuthForm";
import { SEOHead } from "@/components/SEO/SEOHead";

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

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
