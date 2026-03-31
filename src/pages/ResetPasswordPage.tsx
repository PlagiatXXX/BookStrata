import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { apiResetPassword } from "@/lib/authApi";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { sileo } from "sileo";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-red-600">Невалидная ссылка</h2>
          <p className="text-slate-600">Ссылка для сброса пароля отсутствует или повреждена.</p>
          <Link to="/auth">
            <Button variant="outline">Вернуться к входу</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      sileo.error({ title: "Ошибка", description: "Пароль должен быть не менее 8 символов" });
      return;
    }
    if (password !== confirmPassword) {
      sileo.error({ title: "Ошибка", description: "Пароли не совпадают" });
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(token, password);
      sileo.success({
        title: "Успешно",
        description: "Ваш пароль был успешно изменен",
      });
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      sileo.error({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось сбросить пароль",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[url('/library.webp')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/25 backdrop-blur-xs shadow-2xl border border-white/30">
          <div className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-xl font-medium tracking-widest text-slate-800 uppercase">
                Новый пароль
              </h1>
              <p className="mt-3 text-xs text-slate-500">
                Установите новый надежный пароль для вашего аккаунта
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Новый пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="peer w-full bg-transparent border-b border-slate-500/60 py-2 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>

              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Подтвердите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="peer w-full bg-transparent border-b border-slate-500/60 py-2 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-orange-500/80 hover:bg-orange-500 text-white py-2"
              >
                {loading ? "Сохранение..." : "Сбросить пароль"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
