import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuthContext"
import { Spinner } from "@/components/Spinner"
import LandingPage from "@/pages/LandingPage/LandingPage"

export function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
}
