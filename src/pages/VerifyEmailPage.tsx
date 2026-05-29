import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { apiVerifyEmail } from "@/lib/authApi"
import { Card } from "@/ui/Card"
import { Button } from "@/ui/Button"

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Ссылка подтверждения недействительна: отсутствует токен.")
      return
    }

    apiVerifyEmail(token)
      .then((res) => {
        setStatus("success")
        setMessage(res.message || "Email успешно подтверждён!")
      })
      .catch((err) => {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Ошибка подтверждения email")
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
            <p className="text-slate-600">Подтверждение email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="size-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{message}</h2>
            <p className="text-sm text-slate-500">Теперь вы можете войти в аккаунт.</p>
            <Link to="/auth">
              <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-8">
                Войти
              </Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{message}</h2>
            <p className="text-sm text-slate-500">
              Запросите новое письмо для подтверждения на странице входа.
            </p>
            <Link to="/auth">
              <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-8">
                На страницу входа
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}
