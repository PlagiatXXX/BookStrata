import { lazy } from "@/lib/lazy";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GuestRoute } from "@/components/GuestRoute";
import { AdminGuard } from "@/components/AdminGuard";
import AppShell from "./App";

const LandingPage = lazy(() => import("@/pages/LandingPage/LandingPage"));

const DashboardPage = lazy(() => import("@/pages/DashboardPage/DashboardPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const TemplateLibrary = lazy(
  () => import("@/components/TemplateLibrary/TemplateLibrary"),
);
const CommunityPage = lazy(() => import("@/pages/CommunityPage"));
const ForumPage = lazy(() => import("@/pages/ForumPage"));
const BattleDetailPage = lazy(() => import("@/pages/BattleDetailPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage/NewsPage"));
const AdminNewsPage = lazy(() => import("@/pages/AdminNewsPage/AdminNewsPage"));
const AdminCollectionsPage = lazy(() => import("@/pages/AdminCollectionsPage/AdminCollectionsPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard/AdminDashboard"));
const AdminDonorsPage = lazy(() => import("@/pages/AdminDonorsPage/AdminDonorsPage"));
const AdminBattlesPage = lazy(() => import("@/pages/AdminBattlesPage/AdminBattlesPage"));
const AdminFeedbackPage = lazy(() => import("@/pages/AdminFeedbackPage/AdminFeedbackPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/AdminAnalyticsPage/AdminAnalyticsPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage/AdminUsersPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage/PricingPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const OAuthCallbackPage = lazy(() => import("@/pages/OAuthCallbackPage"));
const UserProfilePage = lazy(() => import("@/pages/UserProfilePage/UserProfilePage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage/NotFoundPage"));
const CollectionPage = lazy(() => import("@/pages/CollectionPage/CollectionPage"));
const RankingsPage = lazy(() => import("@/pages/RankingsPage/RankingsPage"));
const WhatToReadPage = lazy(() => import("@/pages/WhatToReadPage/WhatToReadPage"));
const TopicPage = lazy(() => import("@/pages/TopicPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage/BlogPage"));
const BlogArticlePage = lazy(() => import("@/pages/BlogPage/BlogArticlePage"));

// Lazy loading for the DnD-heavy editor page
const TierListEditorPage = lazy(() => import("@/pages/TierListEditorPage/TierEditorPage"));
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <LandingPage /> },
      {
        element: <GuestRoute />,
        children: [
          { path: "/auth", element: <AuthPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/reset-password", element: <ResetPasswordPage /> },
        ],
      },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/history", element: <HistoryPage /> },
      { path: "/oauth/callback", element: <OAuthCallbackPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/pricing", element: <PricingPage /> },
      { path: "/rankings", element: <RankingsPage /> },
      { path: "/what-to-read", element: <WhatToReadPage /> },
      { path: "/blog", element: <BlogPage /> },
      { path: "/blog/:slug", element: <BlogArticlePage /> },
      { path: "/topics/:slug", element: <TopicPage /> },
      { path: "/collections/:slug", element: <CollectionPage /> },
      { path: "/tier-lists/:id", element: <TierListEditorPage /> },
      { path: "/templates", element: <TemplateLibrary /> },
      { path: "/community", element: <CommunityPage /> },
      { path: "/forum", element: <ForumPage /> },
      { path: "/forum/battles/:id", element: <BattleDetailPage /> },
      { path: "/news/:id", element: <NewsPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/users/:id", element: <UserProfilePage /> },
        ],
      },
      {
        path: "/admin",
        element: (
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/news",
        element: (
          <AdminGuard>
            <AdminNewsPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/collections",
        element: (
          <AdminGuard>
            <AdminCollectionsPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/subscriptions",
        element: (
          <AdminGuard>
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <h1 className="text-lg font-bold text-(--ink-0)">Подписки</h1>
              <p className="text-sm text-(--ink-2)">Раздел временно недоступен</p>
            </div>
          </AdminGuard>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <AdminGuard>
            <AdminUsersPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/donors",
        element: (
          <AdminGuard>
            <AdminDonorsPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/battles",
        element: (
          <AdminGuard>
            <AdminBattlesPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/feedback",
        element: (
          <AdminGuard>
            <AdminFeedbackPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/analytics",
        element: (
          <AdminGuard>
            <AdminAnalyticsPage />
          </AdminGuard>
        ),
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
