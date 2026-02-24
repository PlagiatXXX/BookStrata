import { memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/ui/Button";
import { useAuth } from "@/hooks/useAuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useUser } from "@/hooks/useUser";
import { Avatar } from "@/components/Avatar";

interface HeroSectionProps {
  onCreateClick: () => void;
  onLogout: () => void;
}

export const HeroSection = memo(({ onCreateClick, onLogout }: HeroSectionProps) => {
  const { user: authUser, refreshUser } = useAuth();
  const { user } = useUser();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const username = authUser?.username || user?.username;

  useEffect(() => {
    const handleAvatarUpdate = async () => {
      await refreshUser();
    };

    window.addEventListener("avatar-updated", handleAvatarUpdate);
    window.addEventListener("auth-token-changed", handleAvatarUpdate);
    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdate);
      window.removeEventListener("auth-token-changed", handleAvatarUpdate);
    };
  }, [refreshUser]);

  return (
    <div className="relative overflow-hidden px-4 pb-14 pt-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4 md:items-center">
          <div className="min-w-72 flex-1">
            <h1
              className={`mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl ${
                theme === "light" ? "text-slate-900" : "text-[#f3efe6]"
              }`}
            >
              Мои рейтинги
            </h1>
            <p
              className={`mb-2 flex items-center gap-2 text-lg ${
                theme === "light" ? "text-slate-700" : "text-[#b8b1a3]"
              }`}
            >
              <span>Привет,</span>
              <button
                onClick={() => navigate("/profile")}
                className="group inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors cursor-pointer"
              >
                <Avatar
                  url={authUser?.avatarUrl || user?.avatarUrl}
                  username={username}
                  size="md"
                  className="ring-2 ring-(--accent-main)/40"
                />
                <span
                  className={`font-display text-base font-semibold tracking-[0.01em] transition-colors ${
                    theme === "light"
                      ? "text-(--accent-main) group-hover:text-[#b64224]"
                      : "text-(--accent-main) group-hover:text-[#f17a54]"
                  }`}
                >
                  {username}
                </span>
              </button>
              <span>!</span>
              <button
                onClick={onLogout}
                className="ml-auto mr-1 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-xs font-medium text-[#f3efe6] transition-colors hover:border-white/50 hover:bg-black/50 cursor-pointer sm:px-3.5 sm:py-1.5 sm:text-sm"
              >
                Выйти
              </button>
            </p>
            <p className={`text-sm ${theme === "light" ? "text-slate-600" : "text-[#b8b1a3]"}`}>
              Управляйте и организуйте ваши рейтинги в одном месте
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button
            variant="primary"
            onClick={onCreateClick}
            className="w-auto max-w-full rounded-full px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-lg"
          >
            <PlusCircle size={16} className="mr-1.5 align-middle sm:mr-2 sm:size-5" />
            Создать новый тир-лист
          </Button>
        </div>
      </div>
    </div>
  );
});

HeroSection.displayName = "HeroSection";

