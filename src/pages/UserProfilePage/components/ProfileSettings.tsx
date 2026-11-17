import { useEffect, useRef, useState } from "react";
import { Camera, Headphones, KeyRound } from "lucide-react";
import { sileo } from "sileo";
import { useUser } from "@/hooks/useUser";
import { useProfileActions } from "@/pages/ProfilePage/hooks/useProfileActions";
import { PasswordChangeForm } from "@/pages/ProfilePage/components/PasswordChangeForm";
import { ProfileGenresSection } from "@/pages/ProfilePage/components/ProfileGenresSection";
import { AmbientSettingsModal } from "@/components/AmbientSound/AmbientSettingsModal";
import { SocialLinksEditor } from "./SocialLinksEditor";
import type { SocialLink, User } from "@/lib/userApi";

const TOUCH_TARGET = { minHeight: 44 } as const;

interface ProfileSettingsProps {
  user: User;
  onAvatar: () => void;
  onRefresh: () => void;
  initialSection?: "genres" | "social";
}

/**
 * Экран настроек профиля (спека §6.6, макет настройки):
 * 2 колонки (основные настройки + боковая карточка навигации).
 */
export function ProfileSettings({
  user,
  onAvatar,
  onRefresh,
  initialSection,
}: ProfileSettingsProps) {
  const actions = useProfileActions();
  const { updateProfile } = useUser();

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    user.socialLinks ?? [],
  );
  const [isSavingSocials, setIsSavingSocials] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);

  const genresRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target =
      initialSection === "genres"
        ? genresRef.current
        : initialSection === "social"
          ? socialRef.current
          : null;
    if (!target) return;
    target.scrollIntoView?.({ behavior: "smooth", block: "start" });
    target.focus?.({ preventScroll: true });
  }, [initialSection]);

  const handleAvatarClick = () => {
    onAvatar();
  };

  const handleSaveUsername = async () => {
    await actions.saveUsername();
    onRefresh();
  };

  const handleSaveSocials = async (links: SocialLink[]) => {
    setIsSavingSocials(true);
    try {
      await updateProfile({
        username: user.username,
        bio: user.bio,
        socialLinks: links.length > 0 ? links : null,
      });
      setSocialLinks(links);
      sileo.success({ title: "Соцсети обновлены", duration: 2000 });
      onRefresh();
    } catch {
      sileo.error({
        title: "Ошибка сохранения",
        description: "Попробуйте снова",
        duration: 3000,
      });
    } finally {
      setIsSavingSocials(false);
    }
  };

  return (
    <div className="profile-settings-layout" data-testid="profile-settings">
      {/* Аккаунт */}
      <section
        className="card"
        aria-label="Аккаунт"
        data-testid="settings-account"
      >
          <div style={{ marginBottom: 14 }}>
            <h2 className="h" style={{ margin: "0 0 4px" }}>
              Аккаунт · виден только вам
            </h2>
            <div className="m">
              Эти данные не показываются в публичном профиле
            </div>
          </div>

          {/* Имя пользователя */}
          <div className="row" style={{ borderTop: 0 }}>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, color: "#f1f1f5" }}>Имя пользователя</b>
              {actions.isEditingUsername ? (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <input
                    aria-label="Имя пользователя"
                    className="inp"
                    style={{ flex: 1, minWidth: 160 }}
                    value={actions.newUsername}
                    disabled={actions.isSavingUsername}
                    onChange={(e) => actions.setNewUsername(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn pri"
                    disabled={actions.isSavingUsername}
                    onClick={() => void handleSaveUsername()}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={actions.cancelEditUsername}
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="m" style={{ marginTop: 2 }}>
                  @{user.username}
                </div>
              )}
            </div>
            {!actions.isEditingUsername && (
              <button
                type="button"
                className="btn"
                style={{ padding: "8px 16px" }}
                onClick={actions.startEditUsername}
              >
                Изменить
              </button>
            )}
          </div>

          {/* Email */}
          <div className="row">
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, color: "#f1f1f5" }}>Email</b>
              <div className="m" style={{ marginTop: 2 }}>{user.email}</div>
            </div>
          </div>

          {/* Аватар */}
          <div className="row">
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, color: "#f1f1f5" }}>Аватар</b>
              <div className="m" style={{ marginTop: 2 }}>Загрузить или выбрать из набора</div>
            </div>
            <button
              type="button"
              className="btn"
              style={TOUCH_TARGET}
              onClick={handleAvatarClick}
            >
              <Camera size={16} aria-hidden="true" />
              Аватар
            </button>
          </div>

          {/* Пароль */}
          <div className="row">
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, color: "#f1f1f5" }}>Пароль</b>
              <div className="m" style={{ marginTop: 2 }}>Сменить текущий пароль</div>
            </div>
            <button
              type="button"
              className="btn"
              style={TOUCH_TARGET}
              onClick={actions.togglePasswordForm}
            >
              <KeyRound size={16} aria-hidden="true" />
              Пароль
            </button>
          </div>

          {actions.showPasswordForm && (
            <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <PasswordChangeForm
                currentPassword={actions.currentPassword}
                newPassword={actions.newPassword}
                confirmPassword={actions.confirmPassword}
                showPasswords={actions.showPasswords}
                isChangingPassword={actions.isChangingPassword}
                onCurrentPasswordChange={actions.setCurrentPassword}
                onNewPasswordChange={actions.setNewPassword}
                onConfirmPasswordChange={actions.setConfirmPassword}
                onTogglePasswordVisibility={(field) =>
                  actions.setShowPasswords((prev) => ({
                    ...prev,
                    [field]: !prev[field],
                  }))
                }
                onCancel={actions.cancelPasswordChange}
                onSubmit={actions.changePassword}
              />
            </div>
          )}

          {/* Фоновый плеер */}
          <div className="row">
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, color: "#f1f1f5" }}>Фоновый плеер</b>
              <div className="m" style={{ marginTop: 2 }}>Звук и громкость</div>
            </div>
            <button
              type="button"
              className="btn"
              style={TOUCH_TARGET}
              onClick={() => setShowAmbient(true)}
            >
              <Headphones size={16} aria-hidden="true" />
              Плеер
            </button>
          </div>
        </section>

        {/* Любимые жанры */}
        <div
          ref={genresRef}
          data-testid="settings-genres"
          tabIndex={-1}
          className="card"
          style={{ outline: "none" }}
        >
          <ProfileGenresSection />
        </div>

        {/* Соцсети */}
        <div
          ref={socialRef}
          data-testid="settings-social"
          tabIndex={-1}
          className="card"
          style={{ outline: "none" }}
        >
          <SocialLinksEditor
            value={socialLinks}
            onChange={setSocialLinks}
            onSave={(links) => void handleSaveSocials(links)}
            isSaving={isSavingSocials}
          />
        </div>

      <AmbientSettingsModal
        isOpen={showAmbient}
        onClose={() => setShowAmbient(false)}
      />
    </div>
  );
}
