import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthContext';
import { AvatarSelector } from '@/components/Avatar';
import { useUser } from '@/hooks/useUser';
import { Spinner } from '@/components/Spinner';
import { ArrowLeft } from 'lucide-react';
import { sileo } from 'sileo';
import { logger } from '@/lib/logger';
import { ProfileHeader } from './ProfilePage/components/ProfileHeader';
import { ProfileActions } from './ProfilePage/components/ProfileActions';
import { PasswordChangeForm } from './ProfilePage/components/PasswordChangeForm';
import { StatsCards } from './ProfilePage/components/StatsCards';
import { useProfileActions } from './ProfilePage/hooks/useProfileActions';

export function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user: authUser } = useAuth();
  const { user, stats, isLoading, uploadAvatar, refreshUser } = useUser();

  const {
    // Username
    isEditingUsername,
    newUsername,
    isSavingUsername,
    startEditUsername,
    cancelEditUsername,
    saveUsername,
    setNewUsername,

    // Password
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

  const username = authUser?.username || user?.username;

  // Данные загружаются автоматически через useUser (useQuery с enabled: hasToken)

  const handleAvatarSave = async (avatarUrl: string) => {
    try {
      // Последовательное выполнение: сначала загрузка, потом обновление данных
      await uploadAvatar(avatarUrl);
      await refreshUser(); // Зависит от результата uploadAvatar
      window.dispatchEvent(new CustomEvent('avatar-updated'));
      window.dispatchEvent(new CustomEvent('auth-token-changed'));
      sileo.success({ title: 'Аватар обновлен', duration: 3000 });
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), { action: 'handleAvatarSave' });
      sileo.error({
        title: "Ошибка при сохранении аватара",
        description: "Попробуйте загрузить другое изображение",
        duration: 3000
      });
    }
  };

  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

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
    <div className="min-h-screen bg-[#0f0f1a] py-6 dark:bg-[#0f0f1a] light:bg-gray-100 sm:py-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>

        {/* Profile Header */}
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

        {/* Profile Actions */}
        <ProfileActions
          onEditAvatar={() => setShowAvatarSelector(true)}
          onPasswordChange={togglePasswordForm}
          onSettingsClick={() => sileo.show({ title: 'Настройки скоро появятся', icon: '⚙️' })}
        />

        {/* Password Change Form */}
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

        {/* Stats Cards */}
        <StatsCards stats={stats} />
      </div>

      {/* Avatar Selector Modal */}
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
