import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { apiLogin, apiRegister, setAuthToken } from "@/lib/authApi";
import { StorageService } from "@/lib/storage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Spinner } from "@/components/Spinner";


type FormMode = "login" | "register";


export function AuthForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result =
        mode === "login"
          ? await apiLogin({
              username: formData.username,
              password: formData.password,
            })
          : await apiRegister({
              username: formData.username,
              email: formData.email,
              password: formData.password,
            });

      setAuthToken(result.accessToken);
      // Сохраняем username в localStorage для дополнительной безопасности
      StorageService.setString("username", result.username);
      // Отправляем событие для обновления AuthContext
      window.dispatchEvent(new Event("auth-token-changed"));
      // Небольшая задержка, чтобы AuthProvider обновился
      await new Promise((resolve) => setTimeout(resolve, 200));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[url('/library.webp')] bg-cover bg-center">
      {/* затемнение фона */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md bg-white/25 backdrop-blur-xs shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-white/30">
          <div className="p-8">
            <div className="mb-8 text-center">
  <h1 className="text-xl font-medium tracking-wides text-slate-800 uppercase">
  Добро пожаловать
</h1>

  <p className="mt-3 text-xs tracking-wide text-slate-500">
  Вход в персональное пространство
</p>
</div>
            <div className="relative flex justify-center gap-0 mb-10 text-md tracking-widest font-semibold">
  {(["login", "register"] as FormMode[]).map((m) => {
    const active = mode === m;

    return (
      <button
        key={m}
        onClick={() => {
          setMode(m);
          setError(null);
        }}
        className={`
          relative 
          w-32 pb-2 text-center
          transition-colors duration-200 cursor-pointer
          ${active
            ? "text-slate-900"
            : "text-slate-500 hover:text-slate-700"}
        `}
      >
        {m === "login" ? "Вход" : "Регистрация"}
      </button>
    );
  })}

  {/* sliding underline */}
  <span
    className="
      absolute 
      bottom-0
      h-0.5
      w-12
      bg-orange-500
      rounded-full
      transition-transform duration-700
      ease-[cubic-bezier(0.16,1,0.3,1)]
    "
    style={{
      transform: mode === "login"
        ? "translateX(-65px)"
        : "translateX(60px)",
    }}
  />
</div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative group">
                <input
                  type="text"
                  name="username"
                  placeholder="Логин"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="
                  peer
                  w-full 
                  bg-transparent 
                  border-b 
                  border-slate-500/60 
                  py-2 
                  text-slate-900 
                  placeholder:transition-opacity
                  placeholder:duration-200
                  focus:placeholder:opacity-0
                  tracking-wide 
                  focus:outline-none
                  focus:text-slate-950
                  transition-colors
                  duration-200"
                />
                <span
                  className="
      pointer-events-none
      absolute left-0 -bottom-px
      h-0.5 w-full
      origin-left
      scale-x-0
      bg-orange-500
      transition-transform duration-300 ease-out
      peer-focus:scale-x-100
    "
                />
              </div>

              {mode === "register" && (
                <div className="relative group">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full
                    peer
                    bg-transparent 
                    border-b 
                    border-slate-500/60 
                    py-2 
                    text-slate-900 
                    placeholder:transition-opacity
                    placeholder:duration-200
                    focus:placeholder:opacity-0
                    tracking-wide 
                    focus:outline-none"
                  />
                  <span
                    className="
                      pointer-events-none
                      absolute 
                      left-0 
                      -bottom-px
                      h-0.5 
                      w-full
                      origin-left
                      scale-x-0
                      bg-orange-500
                      transition-transform 
                      duration-300 
                      ease-out
                      peer-focus:scale-x-100"
                  />
                </div>
              )}

              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Пароль"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full
                  peer
                  bg-transparent 
                  border-b 
                  border-slate-500/60 
                  py-2 
                  text-slate-900 
                  placeholder:transition-opacity
                  placeholder:duration-200
                  focus:placeholder:opacity-0
                  tracking-wide 
                  focus:outline-none
                  pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
                <span
                  className="
                  pointer-events-none
                  absolute 
                  left-0 
                  -bottom-px
                  h-0.5 
                  w-full
                  origin-left
                  scale-x-0
                  bg-orange-500
                  transition-transform 
                  duration-300 
                  ease-out
                  peer-focus:scale-x-100"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full 
                mt-6 
                rounded-full 
                bg-orange-500/80
                hover:bg-orange-500 
                tracking-wider
                focus-visible:ring-2
                focus-visible:ring-orange-400/60
                focus-visible:ring-offset-2
                focus-visible:ring-offset-transparent
                transition-colors 
                duration-200 
                text-md
                py-2
                text-white"
              >
                {loading
                  ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Загрузка...
                    </>
                  )
                  : mode === "login"
                    ? "Войти"
                    : "Зарегистрироваться"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
