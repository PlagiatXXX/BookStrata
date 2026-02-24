import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Spinner } from "@/components/Spinner";

function AppShell() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="tiermaker-theme">
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
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppShell;
