import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { refreshAccessToken } from "@/lib/authApi"
import { StorageService } from "@/lib/storage"

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        await refreshAccessToken()
        if (cancelled) return
        StorageService.setString("username", "")
        window.dispatchEvent(new Event("auth-token-changed"))
        navigate("/", { replace: true })
      } catch {
        if (cancelled) return
        setError("Токен авторизации не получен. Попробуйте снова.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Ошибка входа</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <a href="/auth" className="text-sm text-orange-500 hover:underline">Вернуться ко входу</a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
          <p className="text-slate-600">Выполняется вход...</p>
        </div>
      </div>
    )
  }

  return null
}