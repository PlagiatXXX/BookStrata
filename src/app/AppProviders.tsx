import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { AiLibrarianProvider } from "@/contexts/AiLibrarianContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { AmbientProvider } from "@/contexts/ambient/AmbientContext";
import type { ReactNode } from "react";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <HelmetProvider>
      <AuthProvider>
        <AiLibrarianProvider>
          <AnalyticsProvider>
            <AmbientProvider>
              {children}
            </AmbientProvider>
          </AnalyticsProvider>
        </AiLibrarianProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
