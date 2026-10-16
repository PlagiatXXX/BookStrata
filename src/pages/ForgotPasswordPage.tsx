import { Link } from "react-router-dom";
import { Card } from "@/ui/Card";
import { SEOHead } from "@/components/SEO/SEOHead";

// Восстановление пароля идёт вручную: SMTP сайта недоступен, поэтому запрос
// уходит живому человеку, а не в молчащий почтовый сервер.
const TELEGRAM_URL = "https://t.me/PasFedor";

const steps = [
  "Напишите нам в Telegram и укажите свой ник в BookStrata.",
  "Пришлём временный пароль на почту, указанную при регистрации.",
  "Войдите и смените пароль в профиле.",
];

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen bg-[url('/library.webp')] bg-cover bg-center">
      <SEOHead title="Восстановление пароля" url="/forgot-password" noindex />
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/25 backdrop-blur-xs shadow-2xl border border-white/30">
          <div className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-xl font-medium tracking-widest text-slate-800 uppercase">
                Восстановление пароля
              </h1>
              <p className="mt-3 text-xs text-slate-500">
                Напишите нам в Telegram — выдадим временный пароль
              </p>
            </div>

            <ol className="space-y-3 text-sm text-slate-700">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="font-medium text-orange-500">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 nb-heavy-border border border-orange-500 bg-orange-500/80 px-4 py-2 text-base text-white transition-[transform,color,background-color,border-color] duration-150 ease-out hover:bg-orange-500 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-(--accent-main) rounded-full"
            >
              Написать в Telegram
            </a>

            <p className="mt-4 text-center text-xs text-slate-600">
              Пароль отправим только на почту, указанную при регистрации. В переписке пароли не
              сообщаем.
            </p>

            <div className="mt-6 text-center">
              <Link
                to="/auth"
                className="text-xs text-slate-500 hover:text-orange-500 transition-colors"
              >
                Вспомнили пароль? Войти
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
