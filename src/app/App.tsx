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
import { SEOHead } from "@/components/SEO/SEOHead";
import { useAnalytics } from "@/hooks/useAnalytics";
import "../styles/sileo-custom.css";

function AppShell() {
  const { pathname } = useLocation();
  const { newAchievement, clearNotification } = useAchievementNotifications();
  const { initIfConsented } = useAnalytics();

  useEffect(() => {
    initIfConsented();
  }, [initIfConsented]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <HelmetProvider>
      <SEOHead url={pathname} />
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
        <CookieConsent />
        <FeedbackButton />
      </AuthProvider>
    </HelmetProvider>
  );
}
export default AppShell;
