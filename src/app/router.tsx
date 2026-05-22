import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
const AdminBattlesPage = lazy(() =>
  import("@/pages/AdminBattlesPage/AdminBattlesPage").then(
    (module) => ({
      default: module.default,
    }),
  ),
);
const AdminUsersPage = lazy(() =>
  import("@/pages/AdminUsersPage/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
  })),
);
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
      { path: "/auth", element: <AuthPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/", element: <DashboardPage /> },
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
        path: "/admin/battles",
        element: (
          <AdminGuard>
            <AdminBattlesPage />
          </AdminGuard>
        ),
      },
    ],
  },
]);
