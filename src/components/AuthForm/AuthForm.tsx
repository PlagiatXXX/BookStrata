import { useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { apiLogin, apiRegister, setAuthToken } from "@/lib/authApi";
import { StorageService } from "@/lib/storage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Spinner } from "@/components/Spinner";


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
}

type AuthAction =
  | { type: "SET_FIELD"; field: keyof AuthState["formData"]; value: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "TOGGLE_PASSWORD" }
  | { type: "RESET_FORM" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_FAILURE"; error: string };

const initialAuthState: AuthState = {
  formData: {
    username: "",
    email: "",
    password: "",
  },
  loading: false,
  error: null,
  showPassword: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        formData: { ...state.formData, [action.field]: action.value },
        error: null,
      };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "TOGGLE_PASSWORD":
      return { ...state, showPassword: !state.showPassword };
    case "RESET_FORM":
      return {
        ...state,
        formData: { username: "", email: "", password: "" },
        error: null,
        showPassword: false,
      };
    case "SUBMIT_START":
      return { ...state, loading: true, error: null };
    case "SUBMIT_SUCCESS":
      return { ...state, loading: false };
    case "SUBMIT_FAILURE":
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export function AuthForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>("login");
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch({ type: "SET_FIELD", field: name as keyof AuthState["formData"], value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SUBMIT_START" });

    try {
      const result =
        mode === "login"
          ? await apiLogin({
              username: state.formData.username,
              password: state.formData.password,
            })
          : await apiRegister({
              username: state.formData.username,
              email: state.formData.email,
              password: state.formData.password,
            });

      setAuthToken(result.accessToken);
      // Сохраняем username в localStorage для дополнительной безопасности
      StorageService.setString("username", result.username);
      // Отправляем событие для обновления AuthContext
      window.dispatchEvent(new Event("auth-token-changed"));
      // Небольшая задержка, чтобы AuthProvider обновился
      await new Promise((resolve) => setTimeout(resolve, 200));
      navigate("/");
      dispatch({ type: "SUBMIT_SUCCESS" });
    } catch (err) {
      dispatch({ type: "SUBMIT_FAILURE", error: err instanceof Error ? err.message : "Ошибка авторизации" });
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
          dispatch({ type: "SET_ERROR", error: null });
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
                  value={state.formData.username}
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
                    value={state.formData.email}
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
                  type={state.showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Пароль"
                  value={state.formData.password}
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
                  onClick={() => dispatch({ type: "TOGGLE_PASSWORD" })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {state.showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
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

              {state.error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {state.error}
                </div>
              )}

              <Button
                type="submit"
                disabled={state.loading}
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
                {state.loading
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
