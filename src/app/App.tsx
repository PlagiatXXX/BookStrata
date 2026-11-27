import { Suspense, lazy, useEffect } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Toaster } from "sileo";
import { Spinner } from "@/components/Spinner";
import { AchievementNotification } from "@/components/AchievementNotification/AchievementNotification";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { usePresence } from "@/hooks/usePresence";
import { SessionExpiredOverlay } from "@/components/SessionExpiredOverlay";
import { DustOverlay } from "@/components/DustDelete";
const FeedbackModal = lazy(() => import("@/components/FeedbackModal").then((m) => ({ default: m.FeedbackModal })));
const SupportWidget = lazy(() => import("@/components/SupportWidget").then((m) => ({ default: m.SupportWidget })));
const DnaWelcomeModal = lazy(() => import("@/components/DnaWelcomeModal").then((m) => ({ default: m.DnaWelcomeModal })));
import { useFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import { useAuth } from "@/hooks/useAuthContext";
import { useDnaWelcomeModal } from "@/components/DnaWelcomeModal";
import { restoreBookReturnScroll } from "@/utils/bookNavigation";
import { AppProviders } from "./AppProviders";
import "../styles/sileo-custom.css";

/** Внутренний контент, рендерится внутри AppProviders — хуки зависящие от AuthProvider безопасны */
function AppShellInner() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { pathname } = useLocation();
  const { newAchievement, clearNotification } = useAchievementNotifications();
  const {
    isOpen: isFeedbackOpen,
    handleDismiss: handleFeedbackDismiss,
    handleSubmit: handleFeedbackSubmit,
    openPrompt: openFeedbackPrompt,
  } = useFeedbackPrompt();
  const {
    isOpen: isDnaWelcomeOpen,
    handleDismiss: handleDnaDismiss,
    handleAccept: handleDnaAccept,
  } = useDnaWelcomeModal({ userId: user?.userId });
  useAnalyticsTracker();
  usePresence({ pathname, userId: user?.userId, isAuthLoading });

  return (
    <>
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
        <main>
          <Outlet />
        </main>
      </Suspense>
      <ScrollRestoration />
      <Toaster position="top-center" theme="system" />
      <DustOverlay />
      <SessionExpiredOverlay />
      <AchievementNotification
        achievement={newAchievement}
        onClose={clearNotification}
      />
      {isFeedbackOpen && (
        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={isFeedbackOpen}
            onDismiss={handleFeedbackDismiss}
            onSubmit={handleFeedbackSubmit}
          />
        </Suspense>
      )}
      {isDnaWelcomeOpen && (
        <Suspense fallback={null}>
          <DnaWelcomeModal
            isOpen={isDnaWelcomeOpen}
            onDismiss={handleDnaDismiss}
            onAccept={handleDnaAccept}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <SupportWidget onOpenFeedbackSurvey={openFeedbackPrompt} />
      </Suspense>
    </>
  );
}

function AppShell() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = `${pathname}${window.location.search}`;
    // setTimeout(0) ensures this runs AFTER React Router's ScrollRestoration
    // which processes popstate synchronously. Without it, our restore fires
    // first and RR overwrites it with its own (wrong) position.
    let cleanupRestore: (() => void) | null = null;
    let frameId = 0;
    const timer = setTimeout(() => {
      frameId = requestAnimationFrame(() => {
        cleanupRestore = restoreBookReturnScroll(path);
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
      cleanupRestore?.();
    };
  }, [pathname]);

  return (
    <AppProviders>
      <AppShellInner />
    </AppProviders>
  );
}
export default AppShell;
