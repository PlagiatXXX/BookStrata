import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppShell from "./App";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
);
const AuthPage = lazy(() =>
  import("@/pages/AuthPage").then((module) => ({
    default: module.AuthPage,
  }))
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  }))
);
const TemplateLibrary = lazy(() => import("@/components/TemplateLibrary/TemplateLibrary"));
const CreateTemplatePage = lazy(() => import("@/pages/CreateTemplatePage"));
const EditTemplatePage = lazy(() => import("@/pages/EditTemplatePage"));
const CommunityPage = lazy(() => import("@/pages/CommunityPage"));

// Lazy loading for the DnD-heavy editor page
const TierListEditorPage = lazy(() =>
  import("@/pages/TierListEditorPage/TierEditorPage").then((module) => ({
    default: module.TierListEditorPage,
  }))
);

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/auth", element: <AuthPage /> },
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
        ],
      },
    ],
  },
]);
