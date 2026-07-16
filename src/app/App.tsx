import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sileo";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import { Spinner } from "@/components/Spinner";
import { AchievementNotification } from "@/components/AchievementNotification/AchievementNotification";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import { FeedbackButton } from "@/components/FeedbackButton/FeedbackButton";
import { CookieConsent } from "@/components/CookieConsent/CookieConsent";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { AiLibrarianProvider } from "@/contexts/AiLibrarianContext";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import "../styles/sileo-custom.css";

function AppShell() {
  const { pathname } = useLocation();
  const { newAchievement, clearNotification } = useAchievementNotifications();
  useAnalyticsTracker();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <HelmetProvider>
      <AuthProvider>
        <AiLibrarianProvider>
        <AnalyticsProvider>
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
            <main><Outlet /></main>
          </Suspense>
          <Toaster position="top-center" theme="system" />
          <AchievementNotification achievement={newAchievement} onClose={clearNotification} />
          <CookieConsent />
          <FeedbackButton raised={pathname.match(/^\/tier-lists\/[^/]+\/?$/)? true : false} withNavMargin={pathname !== "/"} />
        </AnalyticsProvider>
        </AiLibrarianProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
export default AppShell;
