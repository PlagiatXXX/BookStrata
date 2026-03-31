import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { apiForgotPassword } from "@/lib/authApi";
import { sileo } from "sileo";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiForgotPassword(email);
      setSent(true);
      sileo.success({
        title: "Письмо отправлено",
        description: "Проверьте вашу почту для получения инструкций",
      });
    } catch (err) {
      sileo.error({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось отправить запрос",
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
                Сброс пароля
              </h1>
              <p className="mt-3 text-xs text-slate-500">
                {sent 
                  ? "Инструкции отправлены на ваш email" 
                  : "Введите ваш email для получения ссылки на сброс пароля"}
              </p>
            </div>

            {sent ? (
              <div className="space-y-6">
                <div className="text-center text-sm text-slate-700 bg-white/50 p-4 rounded-lg">
                  Мы отправили письмо на <strong>{email}</strong>. Если письма нет, проверьте папку "Спам".
                </div>
                <Link to="/auth">
                  <Button className="w-full rounded-full bg-orange-500/80 hover:bg-orange-500 text-white">
                    Вернуться к входу
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative group">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="peer w-full bg-transparent border-b border-slate-500/60 py-2 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-orange-500/80 hover:bg-orange-500 text-white py-2"
                >
                  {loading ? "Отправка..." : "Отправить ссылку"}
                </Button>

                <div className="text-center">
                  <Link to="/auth" className="text-xs text-slate-500 hover:text-orange-500 transition-colors">
                    Вспомнили пароль? Войти
                  </Link>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
