import { Link, useSearchParams } from "react-router-dom";
import { useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { apiLogin, apiRegister, apiResendVerification, setAuthToken } from "@/lib/authApi";
import { StorageService } from "@/lib/storage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { API_BASE_URL } from "@/lib/config";

type FormMode = "login" | "register";

interface AuthState {
  formData: {
    username: string;
    email: string;
    password: string;
  };
  loading: boolean;
  error: string | null;
  showPassword: boolean;
  acceptedTerms: boolean;
  registeredEmail: string | null;
}

type AuthAction =
  | { type: "SET_FIELD"; field: keyof AuthState["formData"]; value: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "TOGGLE_PASSWORD" }
  | { type: "SET_ACCEPTED_TERMS"; value: boolean }
  | { type: "REGISTER_SUCCESS"; email: string }
  | { type: "RESET" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_FAILURE"; error: string };

const initialAuthState: AuthState = {
  formData: { username: "", email: "", password: "" },
  loading: false,
  error: null,
  showPassword: false,
  acceptedTerms: false,
  registeredEmail: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, formData: { ...state.formData, [action.field]: action.value }, error: null }
    case "SET_LOADING":
      return { ...state, loading: action.loading }
    case "SET_ERROR":
      return { ...state, error: action.error }
    case "TOGGLE_PASSWORD":
      return { ...state, showPassword: !state.showPassword }
    case "SET_ACCEPTED_TERMS":
      return { ...state, acceptedTerms: action.value }
    case "REGISTER_SUCCESS":
      return {
        ...state,
        loading: false,
        registeredEmail: action.email,
        formData: { username: "", email: "", password: "" },
      }
    case "RESET":
      return { ...initialAuthState }
    case "SUBMIT_START":
      return { ...state, loading: true, error: null }
    case "SUBMIT_SUCCESS":
      return { ...state, loading: false }
    case "SUBMIT_FAILURE":
      return { ...state, loading: false, error: action.error }
    default:
      return state
  }
}

export function AuthForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<FormMode>(() => {
    return searchParams.get("mode") === "register" ? "register" : "login"
  });
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    dispatch({ type: "SET_FIELD", field: name as keyof AuthState["formData"], value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({ type: "SUBMIT_START" })

    try {
      if (mode === "login") {
        const result = await apiLogin({
          username: state.formData.username,
          password: state.formData.password,
        })
        setAuthToken(result.accessToken)
        StorageService.setString("username", result.username)
        window.dispatchEvent(new Event("auth-token-changed"))
        await new Promise((resolve) => setTimeout(resolve, 200))
        window.ym?.(109755750, 'reachGoal', 'login')
        navigate("/dashboard")
        dispatch({ type: "SUBMIT_SUCCESS" })
      } else {
        await apiRegister({
          username: state.formData.username,
          email: state.formData.email,
          password: state.formData.password,
          acceptedTerms: state.acceptedTerms,
        })
        window.ym?.(109755750, 'reachGoal', 'register')
        dispatch({ type: "REGISTER_SUCCESS", email: state.formData.email })
      }
    } catch (err) {
      dispatch({ type: "SUBMIT_FAILURE", error: err instanceof Error ? err.message : "Ошибка" })
    }
  }

  const handleResend = async () => {
    if (!state.registeredEmail) return
    dispatch({ type: "SUBMIT_START" })
    try {
      await apiResendVerification(state.registeredEmail)
      dispatch({ type: "SET_ERROR", error: null })
      dispatch({ type: "SUBMIT_SUCCESS" })
      alert("Новое письмо отправлено! Проверьте почту.")
    } catch (err) {
      dispatch({ type: "SUBMIT_FAILURE", error: err instanceof Error ? err.message : "Ошибка" })
    }
  }

  if (state.registeredEmail) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <video autoPlay muted playsInline className="hidden md:block absolute inset-0 w-full h-full object-cover">
            <source src="/library4k-hq.mp4" type="video/mp4" />
          </video>
          <img src="/library.webp" alt="" className="md:hidden absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm md:max-w-md bg-white/25 backdrop-blur-xs shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-white/30">
            <div className="p-6 md:p-8 text-center">
              <div className="size-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="size-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Подтвердите email</h2>
              <p className="text-sm text-slate-600 mb-1">
                Мы отправили письмо на
              </p>
              <p className="text-sm font-medium text-slate-800 mb-4">
                {state.registeredEmail}
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Перейдите по ссылке в письме, чтобы активировать аккаунт.
                Письмо может прийти в папку «Спам».
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={handleResend} isLoading={state.loading} className="w-full rounded-full bg-orange-500/80 hover:bg-orange-500 text-white">
                  Отправить ещё раз
                </Button>
                <button
                  onClick={() => { dispatch({ type: "RESET" }); setMode("login") }}
                  className="text-sm text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  Вернуться ко входу
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <video autoPlay muted playsInline className="hidden md:block absolute inset-0 w-full h-full object-cover">
            <source src="/library4k-hq.mp4" type="video/mp4" />
          </video>
          <img src="/library.webp" alt="" className="md:hidden absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm md:max-w-md bg-white/25 backdrop-blur-xs shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-white/30">
            <div className="p-6 md:p-8">
            <div className="mb-6 md:mb-8 text-center">
              <h1 className="text-lg md:text-xl font-medium tracking-widest text-slate-800 uppercase">
                Добро пожаловать
              </h1>
              <p className="mt-3 text-xs tracking-wide text-slate-500">
                Вход в персональное пространство
              </p>
            </div>

            <div className="relative flex justify-center gap-0 mb-6 md:mb-10 text-md tracking-widest font-semibold">
              {(["login", "register"] as FormMode[]).map((m) => {
                const active = mode === m
                return (
                  <button
                    key={m}
                    onClick={() => { setMode(m); dispatch({ type: "SET_ERROR", error: null }) }}
                    className={`relative w-32 pb-2 text-center transition-colors duration-200 cursor-pointer ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {m === "login" ? "Вход" : "Регистрация"}
                  </button>
                )
              })}
              <span
                className="absolute bottom-0 h-0.5 w-12 bg-orange-500 rounded-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: mode === "login" ? "translateX(-65px)" : "translateX(60px)" }}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div className="relative group">
                <label htmlFor="username" className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-1 block">
                  Логин <span className="text-red-500">*</span>
                </label>
                <input
                  id="username" type="text" name="username"
                  value={state.formData.username} onChange={handleChange} required
                  className="peer w-full bg-transparent border-b border-slate-500/60 py-2 text-slate-900 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0 tracking-wide focus:outline-none focus:text-slate-950 transition-colors duration-200"
                />
                <span className="pointer-events-none absolute left-0 -bottom-px h-0.5 w-full origin-left scale-x-0 bg-orange-500 transition-transform duration-300 ease-out peer-focus:scale-x-100" />
              </div>

              {mode === "register" && (
                <div className="relative group">
                  <label htmlFor="email" className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-1 block">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email" type="email" name="email"
                    value={state.formData.email} onChange={handleChange} required
                    className="peer w-full bg-transparent border-b border-slate-500/60 py-2 text-slate-900 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0 tracking-wide focus:outline-none"
                  />
                  <span className="pointer-events-none absolute left-0 -bottom-px h-0.5 w-full origin-left scale-x-0 bg-orange-500 transition-transform duration-300 ease-out peer-focus:scale-x-100" />
                </div>
              )}

              <div className="relative group">
                <label htmlFor="password" className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-1 block">
                  Пароль <span className="text-red-500">*</span>
                </label>
                <input
                  id="password" type={state.showPassword ? "text" : "password"} name="password"
                  value={state.formData.password} onChange={handleChange} required
                  className="peer w-full bg-transparent border-b border-slate-500/60 py-2 text-slate-900 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0 tracking-wide focus:outline-none pr-10"
                />
                <button
                  type="button" onClick={() => dispatch({ type: "TOGGLE_PASSWORD" })}
                  aria-label={state.showPassword ? "Скрыть пароль" : "Показать пароль"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {state.showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
                <span className="pointer-events-none absolute left-0 -bottom-px h-0.5 w-full origin-left scale-x-0 bg-orange-500 transition-transform duration-300 ease-out peer-focus:scale-x-100" />
              </div>
              {mode === "login" && (
                <div className="flex justify-end -mt-4">
                  <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-orange-500 transition-colors">
                    Забыли пароль?
                  </Link>
                </div>
              )}

              {mode === "register" && (
                <>
                  {/* captcha — закомментировано, готово к подключению */}
                  {/* <SmartCaptcha sitekey={import.meta.env.VITE_SMARTCAPTCHA_SITE_KEY} onSuccess={...} /> */}

                  <label className="flex items-start gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={state.acceptedTerms}
                      onChange={(e) => dispatch({ type: "SET_ACCEPTED_TERMS", value: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      Я принимаю{" "}
                      <Link to="/privacy" target="_blank" className="text-orange-500 hover:text-orange-600 underline">
                        условия использования и политику конфиденциальности
                      </Link>
                    </span>
                  </label>
                </>
              )}

              {state.error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{state.error}</div>
              )}

              <Button
                type="submit"
                isLoading={state.loading}
                className="w-full -mt-5 rounded-full bg-orange-500/80 hover:bg-orange-500 tracking-wider focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors duration-200 text-sm py-1.5 text-white"
              >
                {mode === "login" ? "Войти" : "Зарегистрироваться"}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
                <div className="relative flex items-center gap-2">
                  <span className="flex-1 h-px bg-slate-300/60" />
                  <span className="text-xs font-medium text-slate-500 tracking-wide">или войти с помощью</span>
                  <span className="flex-1 h-px bg-slate-300/60" />
                </div>
                <div className="flex justify-center gap-3">
                  <a
                    href={`${API_BASE_URL}/auth/oauth/vk`}
                    className="flex items-center justify-center size-9 rounded-full border border-slate-300/60 hover:bg-slate-100/50 transition-colors"
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="#4680C2">
                      <path d="M11.7 18h1.4s.4-.05.6-.2c.2-.15.2-.45.2-.45s-.03-1.3.6-1.5c.6-.2 1.4 1.3 2.2 1.8.6.4 1 .3 1 .3l2.2-.03s1.15-.07.6-.95c-.04-.07-.3-.65-1.6-1.85-1.3-1.2-1.1-1 .45-3.15 1-1.3 1.4-2.1 1.2-2.45-.1-.25-.8-.2-.8-.2l-2.3.02s-.17-.02-.3.07c-.13.08-.2.23-.2.23s-.3.8-.7 1.5c-.8 1.4-1.1 1.5-1.25 1.4-.3-.2-.2-.85-.2-1.3 0-1.4.2-2-.4-2.15-.2-.07-.5-.1-.8-.1-1.2 0-2.2.75-2.2.75s-.45.25-.6.35c0 0-.07.03-.1.05h-.02v.02s0-.02-.02-.02c-.07-.07-.1-.1-.1-.1s-.6-.65-1-.9C9.5 6.3 8.9 6 8.9 6s-.75-.2-.4.3c.25.4.8 1.2 1.1 1.6.4.6.5.9.5.9s.2.35.1.65c-.15.4-.8 1.7-1.1 2-.2.2-.5.2-.7.15-.5-.1-1.1-.75-1.6-1.5C6.4 9.5 6 8.8 6 8.8s-.1-.25-.25-.35c-.2-.1-.5-.1-.5-.1l-2.2.02s-.33.01-.45.15c-.1.15 0 .45 0 .45s1.3 3.1 2.9 4.7c1.4 1.4 3 1.3 3 1.3h.7z" />
                    </svg>
                  </a>
                  <a
                    href={`${API_BASE_URL}/auth/oauth/google`}
                    className="flex items-center justify-center size-9 rounded-full border border-slate-300/60 hover:bg-slate-100/50 transition-colors"
                  >
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </a>
                </div>
              </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
