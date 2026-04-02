import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sileo";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import { Spinner } from "@/components/Spinner";
import { AchievementNotification } from "@/components/AchievementNotification/AchievementNotification";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import "../styles/sileo-custom.css";

function AppShell() {
  const { newAchievement, clearNotification } = useAchievementNotifications();

  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-400">Загрузка...</p>
            </div>
          </div>
        }
      >
        <Outlet />
      </Suspense>
      <Toaster position="top-center" theme="system" />
      <AchievementNotification achievement={newAchievement} onClose={clearNotification} />
    </AuthProvider>
  );
}

export default AppShell;
