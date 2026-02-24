import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordChangeFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showPasswords: {
    current: boolean;
    new: boolean;
    confirm: boolean;
  };
  isChangingPassword: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePasswordVisibility: (field: 'current' | 'new' | 'confirm') => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

function PasswordInput({
  label,
  value,
  visible,
  placeholder,
  onChange,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  visible: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-surface-light px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#2d2d44] light:bg-gray-100 light:text-gray-900"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-white cursor-pointer"
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export function PasswordChangeForm({
  currentPassword,
  newPassword,
  confirmPassword,
  showPasswords,
  isChangingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onTogglePasswordVisibility,
  onCancel,
  onSubmit,
}: PasswordChangeFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-2xl bg-[#1a1a2e] p-5 shadow-xl dark:bg-[#1a1a2e] light:bg-white sm:p-8"
    >
      <div className="mb-6 flex items-center gap-2">
        <Lock size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
          Смена пароля
        </h2>
      </div>

      <div className="space-y-4">
        <PasswordInput
          label="Текущий пароль"
          value={currentPassword}
          visible={showPasswords.current}
          placeholder="Введите текущий пароль"
          onChange={onCurrentPasswordChange}
          onToggleVisibility={() => onTogglePasswordVisibility('current')}
        />

        <PasswordInput
          label="Новый пароль"
          value={newPassword}
          visible={showPasswords.new}
          placeholder="Введите новый пароль"
          onChange={onNewPasswordChange}
          onToggleVisibility={() => onTogglePasswordVisibility('new')}
        />

        <PasswordInput
          label="Подтверждение пароля"
          value={confirmPassword}
          visible={showPasswords.confirm}
          placeholder="Повторите новый пароль"
          onChange={onConfirmPasswordChange}
          onToggleVisibility={() => onTogglePasswordVisibility('confirm')}
        />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isChangingPassword}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isChangingPassword ? 'Сохраняем...' : 'Сменить пароль'}
        </button>
      </div>
    </form>
  );
}
