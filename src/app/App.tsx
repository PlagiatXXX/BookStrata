import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sileo";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import { Spinner } from "@/components/Spinner";
import "../styles/sileo-custom.css";

function AppShell() {
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
    </AuthProvider>
  );
}

export default AppShell;
