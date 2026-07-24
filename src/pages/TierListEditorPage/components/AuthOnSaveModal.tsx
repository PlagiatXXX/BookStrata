import { useState } from "react"
import { motion } from "motion/react"
import { X, Mail, User, Lock, Loader } from "lucide-react"
import { apiRegister, setAuthToken } from "@/lib/authApi"
import { StorageService } from "@/lib/storage"
import { useAuth } from "@/hooks/useAuthContext"
import { sileo } from "sileo"

interface AuthOnSaveModalProps {
  isOpen: boolean
  onClose: () => void
  /** Вызывается после успешной регистрации */
  onSuccess: () => void
  /** Предзаполненное название тир-листа */
  initialTitle: string
  /** Обновить название перед сохранением */
  onTitleChange: (title: string) => void
}

export function AuthOnSaveModal({
  isOpen,
  onClose,
  onSuccess,
  initialTitle,
  onTitleChange,
}: AuthOnSaveModalProps) {
  const { refreshUser } = useAuth()
  const [step, setStep] = useState<"title" | "register">("title")
  const [title, setTitle] = useState(initialTitle)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleContinue = () => {
    if (!title.trim()) {
      sileo.error({ title: "Введите название тир-листа" })
      return
    }
    onTitleChange(title.trim())
    setStep("register")
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Заполните все поля")
      return
    }
    if (!acceptedTerms) {
      setError("Примите условия использования")
      return
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await apiRegister({
        username: username.trim(),
        email: email.trim(),
        password,
        acceptedTerms,
      })
      setAuthToken(result.accessToken)
      StorageService.setString("username", result.username)
      window.dispatchEvent(new Event("auth-token-changed"))
      await new Promise((resolve) => setTimeout(resolve, 200))
      await refreshUser()
      sileo.success({ title: "Аккаунт создан!", description: "Сохраняем ваш тир-лист..." })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setStep("title")
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/75" onClick={handleClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative mx-4 w-full max-w-md border-2 border-black bg-[#111111] text-[#f6f1e8] shadow-[8px_8px_0_0_#000000]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black bg-[#181818] p-5">
          <h2 className="text-lg font-black tracking-[-0.02em]">
            {step === "title" ? "Назовите тир-лист" : "Создать аккаунт"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex size-8 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === "title" ? (
            <div className="space-y-4">
              <p className="text-sm text-[#a8abad]">
                Ваш тир-лист пока сохранён только в браузере. Дайте ему название, чтобы после регистрации он получил красивый адрес.
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название тир-листа"
                maxLength={100}
                autoFocus
                className="w-full border-2 border-black bg-[#0a0a0a] px-4 py-3 text-sm text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400"
              />
              <button
                type="button"
                onClick={handleContinue}
                className="w-full cursor-pointer border-2 border-black bg-[#c1fffe] px-5 py-3 text-sm font-black text-black transition-colors hover:bg-[#9cf5f3] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              >
                Продолжить
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-sm text-[#a8abad]">
                Создайте аккаунт, чтобы сохранить тир-лист «{title}» и получить доступ ко всем возможностям BookStrata.
              </p>

              {error && (
                <div className="border-2 border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="auth-username" className="text-xs font-bold uppercase tracking-[0.1em] text-[#c1fffe]">
                  Имя пользователя
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8688]" />
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    autoFocus
                    className="w-full border-2 border-black bg-[#0a0a0a] py-3 pl-10 pr-4 text-sm text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="auth-email" className="text-xs font-bold uppercase tracking-[0.1em] text-[#c1fffe]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8688]" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border-2 border-black bg-[#0a0a0a] py-3 pl-10 pr-4 text-sm text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-[0.1em] text-[#c1fffe]">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8688]" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Не менее 6 символов"
                    className="w-full border-2 border-black bg-[#0a0a0a] py-3 pl-10 pr-4 text-sm text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-[#c1fffe]"
                />
                <span className="text-xs text-[#a8abad]">
                  Я принимаю{' '}
                  <a href="/terms" target="_blank" className="text-[#c1fffe] underline" rel="noreferrer">условия использования</a>
                  {' '}и{' '}
                  <a href="/privacy" target="_blank" className="text-[#c1fffe] underline" rel="noreferrer">политику конфиденциальности</a>
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 border-2 border-black bg-[#c1fffe] px-5 py-3 text-sm font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:text-black disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Создаём аккаунт...
                  </>
                ) : (
                  "Создать аккаунт и сохранить"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("title")
                  setError(null)
                }}
                disabled={isSubmitting}
                className="w-full cursor-pointer text-center text-xs text-[#7d8688] underline transition-colors hover:text-[#a8abad] disabled:opacity-50"
              >
                ← Назад к названию
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
