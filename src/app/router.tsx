import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomeRoute } from "@/components/HomeRoute";
import { AdminGuard } from "@/components/AdminGuard";
import AppShell from "./App";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const AuthPage = lazy(() =>
  import("@/pages/AuthPage").then((module) => ({
    default: module.AuthPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const TemplateLibrary = lazy(
  () => import("@/components/TemplateLibrary/TemplateLibrary"),
);
const CreateTemplatePage = lazy(() => import("@/pages/CreateTemplatePage"));
const EditTemplatePage = lazy(() => import("@/pages/EditTemplatePage"));
const CommunityPage = lazy(() => import("@/pages/CommunityPage"));
const ForumPage = lazy(() => import("@/pages/ForumPage"));
const BattleDetailPage = lazy(() => import("@/pages/BattleDetailPage"));
const NewsPage = lazy(() =>
  import("@/pages/NewsPage").then((module) => ({
    default: module.NewsPage,
  })),
);
const AdminNewsPage = lazy(() =>
  import("@/pages/AdminNewsPage").then((module) => ({
    default: module.AdminNewsPage,
  })),
);
const AdminCollectionsPage = lazy(() =>
  import("@/pages/AdminCollectionsPage").then((module) => ({
    default: module.AdminCollectionsPage,
  })),
);
const AdminDashboard = lazy(() =>
  import("@/pages/AdminDashboard/AdminDashboard").then((module) => ({
    default: module.default,
  })),
);
const AdminSubscriptionsPage = lazy(() =>
  import("@/pages/AdminSubscriptionsPage/AdminSubscriptionsPage").then(
    (module) => ({
      default: module.default,
    }),
  ),
);
const AdminDonorsPage = lazy(() =>
  import("@/pages/AdminDonorsPage/AdminDonorsPage").then((module) => ({
    default: module.AdminDonorsPage,
  })),
);
const AdminBattlesPage = lazy(() =>
  import("@/pages/AdminBattlesPage/AdminBattlesPage").then(
    (module) => ({
      default: module.default,
    }),
  ),
);
const AdminFeedbackPage = lazy(() =>
  import("@/pages/AdminFeedbackPage/AdminFeedbackPage").then(
    (module) => ({
      default: module.AdminFeedbackPage,
    }),
  ),
);
const AdminUsersPage = lazy(() =>
  import("@/pages/AdminUsersPage/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
  })),
);
const ContactPage = lazy(() => import("@/pages/ContactPage"))
const PricingPage = lazy(() => import("@/pages/PricingPage/PricingPage"))
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })))
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then(m => ({ default: m.PrivacyPage })))
const OAuthCallbackPage = lazy(() => import("@/pages/OAuthCallbackPage").then(m => ({ default: m.OAuthCallbackPage })))
const UserProfilePage = lazy(() => import("@/pages/UserProfilePage/UserProfilePage"))
const CollectionPage = lazy(() =>
  import("@/pages/CollectionPage").then((module) => ({
    default: module.CollectionPage,
  })),
);

// Lazy loading for the DnD-heavy editor page
const TierListEditorPage = lazy(() =>
  import("@/pages/TierListEditorPage/TierEditorPage").then((module) => ({
    default: module.TierListEditorPage,
  })),
);

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomeRoute /> },
      { path: "/auth", element: <AuthPage /> },
      { path: "/verify-email", element: <VerifyEmailPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/oauth/callback", element: <OAuthCallbackPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/pricing", element: <PricingPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          {
            path: "/tier-lists/:id",
            element: <TierListEditorPage />,
          },
          {
            path: "/templates",
            element: <TemplateLibrary />,
          },
          {
            path: "/templates/new",
            element: <CreateTemplatePage />,
          },
          {
            path: "/templates/:id/edit",
            element: <EditTemplatePage />,
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
          {
            path: "/community",
            element: <CommunityPage />,
          },
          {
            path: "/forum",
            element: <ForumPage />,
          },
          {
            path: "/forum/battles/:id",
            element: <BattleDetailPage />,
          },
          {
            path: "/news/:id",
            element: <NewsPage />,
          },
          {
            path: "/collections/:id",
            element: <CollectionPage />,
          },
          {
            path: "/users/:id",
            element: <UserProfilePage />,
          },
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
            <AdminSubscriptionsPage />
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
    ],
  },
]);
