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
  /** Открытие редактирования аватара (родитель обновляет аватар в hero). */
  onAvatar: () => void;
  /** Перезагрузить данные профиля после изменения. */
  onRefresh: () => void;
  /** Блок, который нужно показать/профокусировать при открытии настроек. */
  initialSection?: "genres" | "social";
}

/**
 * Экран настроек профиля (спека §6.6): аккаунт, аватар, пароль, плеер,
 * любимые жанры и соцсети. Только для владельца профиля.
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
    <div className="profile-settings">
      {/* ── Аккаунт · виден только вам ── */}
      <section
        className="profile-settings__card"
        aria-label="Аккаунт"
        data-testid="settings-account"
      >
        <header className="profile-settings__card-header">
          <h2 className="profile-settings__title">Аккаунт · виден только вам</h2>
          <p className="profile-settings__hint">
            Эти данные не показываются в публичном профиле
          </p>
        </header>

        <div className="profile-settings__row">
          <div className="profile-settings__row-info">
            <span className="profile-settings__label">Имя пользователя</span>
            {actions.isEditingUsername ? (
              <div className="profile-settings__inline">
                <input
                  aria-label="Имя пользователя"
                  className="profile-settings__input"
                  style={TOUCH_TARGET}
                  value={actions.newUsername}
                  disabled={actions.isSavingUsername}
                  onChange={(e) => actions.setNewUsername(e.target.value)}
                />
                <button
                  type="button"
                  className="profile-settings__btn profile-settings__btn--primary"
                  style={TOUCH_TARGET}
                  disabled={actions.isSavingUsername}
                  onClick={() => void handleSaveUsername()}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="profile-settings__btn"
                  style={TOUCH_TARGET}
                  onClick={actions.cancelEditUsername}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="profile-settings__inline">
                <span className="profile-settings__value">
                  @{user.username}
                </span>
                <button
                  type="button"
                  className="profile-settings__btn"
                  style={TOUCH_TARGET}
                  onClick={actions.startEditUsername}
                >
                  Изменить
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-settings__row">
          <span className="profile-settings__label">Email</span>
          <span className="profile-settings__value">{user.email}</span>
        </div>

        <div className="profile-settings__row">
          <span className="profile-settings__label">Аватар</span>
          <button
            type="button"
            className="profile-settings__btn"
            style={TOUCH_TARGET}
            onClick={handleAvatarClick}
          >
            <Camera size={16} aria-hidden="true" />
            Аватар
          </button>
        </div>

        <div className="profile-settings__row">
          <span className="profile-settings__label">Пароль</span>
          <button
            type="button"
            className="profile-settings__btn"
            style={TOUCH_TARGET}
            onClick={actions.togglePasswordForm}
          >
            <KeyRound size={16} aria-hidden="true" />
            Пароль
          </button>
        </div>

        {actions.showPasswordForm && (
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
        )}

        <div className="profile-settings__row">
          <span className="profile-settings__label">Фоновый плеер</span>
          <button
            type="button"
            className="profile-settings__btn"
            style={TOUCH_TARGET}
            onClick={() => setShowAmbient(true)}
          >
            <Headphones size={16} aria-hidden="true" />
            Плеер
          </button>
        </div>
      </section>

      {/* ── Любимые жанры ── */}
      <div
        ref={genresRef}
        data-testid="settings-genres"
        tabIndex={-1}
        className="profile-settings__card profile-settings__focusable"
      >
        <ProfileGenresSection />
      </div>

      {/* ── Соцсети ── */}
      <div
        ref={socialRef}
        data-testid="settings-social"
        tabIndex={-1}
        className="profile-settings__card profile-settings__focusable"
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
