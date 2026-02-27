import { useState } from 'react';
import { sileo } from 'sileo';
import { useAuth } from '@/hooks/useAuthContext';
import { getAuthToken } from '@/lib/authApi';
import { API_BASE_URL } from '@/lib/config';
import { logger } from '@/lib/logger';

interface UseProfileActionsReturn {
  // Username states
  isEditingUsername: boolean;
  newUsername: string;
  isSavingUsername: boolean;
  startEditUsername: () => void;
  cancelEditUsername: () => void;
  saveUsername: () => Promise<void>;
  setNewUsername: (value: string) => void;

  // Password states
  showPasswordForm: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showPasswords: {
    current: boolean;
    new: boolean;
    confirm: boolean;
  };
  isChangingPassword: boolean;
  togglePasswordForm: () => void;
  cancelPasswordChange: () => void;
  changePassword: (e: React.FormEvent) => Promise<void>;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowPasswords: (value: React.SetStateAction<{ current: boolean; new: boolean; confirm: boolean }>) => void;
}

export function useProfileActions(): UseProfileActionsReturn {
  const { user: authUser } = useAuth();
  const username = authUser?.username;

  // Username states
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Password states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<{
    current: boolean;
    new: boolean;
    confirm: boolean;
  }>({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const startEditUsername = () => {
    setNewUsername(username || '');
    setIsEditingUsername(true);
  };

  const cancelEditUsername = () => {
    setNewUsername('');
    setIsEditingUsername(false);
  };

  const saveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim() === username) {
      setIsEditingUsername(false);
      return;
    }

    setIsSavingUsername(true);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch(
        `${API_BASE_URL}/users/me`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username: newUsername.trim() }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при сохранении');
      }

      sileo.success({ title: 'Имя пользователя обновлено', duration: 3000 });
      setIsEditingUsername(false);
      window.dispatchEvent(new CustomEvent('auth-token-changed'));
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: 'saveUsername',
      });
      sileo.error({ 
        title: error instanceof Error ? error.message : 'Ошибка при сохранении', 
        description: 'Проверьте соединение и попробуйте снова',
        duration: 3000 
      });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const togglePasswordForm = () => {
    if (showPasswordForm) {
      cancelPasswordChange();
      return;
    }
    setShowPasswordForm(true);
  };

  const cancelPasswordChange = () => {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      sileo.error({ 
        title: 'Пароли не совпадают', 
        description: 'Проверьте, что новый пароль и подтверждение одинаковы',
        duration: 3000 
      });
      return;
    }

    if (newPassword.length < 4) {
      sileo.error({ 
        title: 'Короткий пароль', 
        description: 'Пароль должен быть не менее 4 символов',
        duration: 3000 
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch(
        `${API_BASE_URL}/users/me/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при смене пароля');
      }

      sileo.success({ title: 'Пароль успешно изменён', duration: 3000 });
      cancelPasswordChange();
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        action: 'changePassword',
      });
      sileo.error({ 
        title: error instanceof Error ? error.message : 'Ошибка при смене пароля', 
        description: 'Проверьте текущий пароль и попробуйте снова',
        duration: 3000 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return {
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
  };
}
