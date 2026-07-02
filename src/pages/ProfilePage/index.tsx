import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sileo } from "sileo";
import { AchievementsGrid } from "./components/AchievementsGrid";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileActions } from "./components/ProfileActions";
import { PasswordChangeForm } from "./components/PasswordChangeForm";
import { StatsCards } from "./components/StatsCards";
import { useProfileActions } from "./hooks/useProfileActions";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuthContext";
import { useUser } from "@/hooks/useUser";
import { AvatarSelector } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { createLogger } from "@/lib/logger";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { MobileBottomNav } from "@/ui/MobileBottomNav";

const logger = createLogger("ProfilePage", { color: "blue" });

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user: authUser } = useAuth();
  const { user, stats, isLoading, uploadAvatar } = useUser();
  const {
    achievements,
    status: achievementStatus,
    isLoading: isAchievementsLoading,
  } = useAchievements();

  const {
    isEditingUsername,
    newUsername,
    isSavingUsername,
    startEditUsername,
    cancelEditUsername,
    saveUsername,
    setNewUsername,
    showPasswordForm,
    currentPassword,
    newPassword,
    confirmPassword,
    showPasswords,
    isChangingPassword,
    togglePasswordForm,
    cancelPasswordChange,
    changePassword,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    setShowPasswords,
  } = useProfileActions();

  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const username = authUser?.username || user?.username;

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleAvatarSave = async (avatarUrl: string) => {
    try {
      await uploadAvatar(avatarUrl);
      logger.info("Avatar updated", {
        newAvatarUrl: avatarUrl.substring(0, 50) + "...",
      });
      sileo.success({ title: "Аватар обновлен", duration: 3000 });
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: "handleAvatarSave",
      });
      sileo.error({
        title: "Ошибка при сохранении аватара",
        description: "Попробуйте загрузить другое изображение",
        duration: 3000,
      });
      throw error;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] dark:bg-[#0f0f1a] light:bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white dark:text-white light:text-gray-900 mb-4">
            Пожалуйста, войдите в систему
          </h1>
          <a href="/auth" className="text-primary hover:underline">
            Перейти на страницу входа
          </a>
        </div>
      </div>
    );
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] dark:bg-[#0f0f1a] light:bg-gray-100">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] dark:bg-[#0f0f1a] light:bg-gray-100">
      <div className="hidden md:block">
        <Header hideLogout />
      </div>
      <div className="pt-4 sm:pt-24 pb-20 md:pb-10">
        <div className="mx-auto px-4 w-full max-w-2xl sm:px-6 lg:max-w-4xl">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 sm:mb-6 cursor-pointer"
          >
            <ArrowLeft size={16} className="sm:size-5" />
            <span>Назад</span>
          </button>

          <div className="mb-4">
            {achievementStatus?.title && (
              <div className="mb-2 rounded-full bg-yellow-400/20 px-4 py-1 border border-yellow-400/30 inline-block">
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                  {achievementStatus.icon && <span className="mr-1.5">{achievementStatus.icon}</span>}
                  {achievementStatus.title}
                </p>
              </div>
            )}
            <ProfileHeader
              user={user || undefined}
              username={username}
              isEditingUsername={isEditingUsername}
              newUsername={newUsername}
              isSavingUsername={isSavingUsername}
              onEditAvatar={() => setShowAvatarSelector(true)}
              onStartEditUsername={startEditUsername}
              onCancelEditUsername={cancelEditUsername}
              onSaveUsername={saveUsername}
              onUsernameChange={setNewUsername}
            />
          </div>

          <ProfileActions
            onEditAvatar={() => setShowAvatarSelector(true)}
            onPasswordChange={togglePasswordForm}
            onSettingsClick={() =>
              sileo.show({ title: "Настройки скоро появятся", icon: "⚙️" })
            }
            onAdminPanelClick={() => navigate("/admin")}
            userRole={authUser?.role}
          />

          {showPasswordForm && (
            <PasswordChangeForm
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              showPasswords={showPasswords}
              isChangingPassword={isChangingPassword}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onTogglePasswordVisibility={(field) =>
                setShowPasswords((prev) => ({
                  ...prev,
                  [field]: !prev[field],
                }))
              }
              onCancel={cancelPasswordChange}
              onSubmit={changePassword}
            />
          )}

          <StatsCards stats={stats} />

          <AchievementsGrid
            achievements={achievements}
            isLoading={isAchievementsLoading}
          />
        </div>
      </div>

      <MobileBottomNav />
      <Footer />

      {showAvatarSelector && (
        <AvatarSelector
          currentAvatar={user?.avatarUrl}
          username={username}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </div>
  );
}
