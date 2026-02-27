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
      <span className="mb-2 block text-sm font-medium text-orange-300/90">{label}</span>
      <div className="group relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-orange-500/30 bg-black/40 px-4 py-3 pr-12 text-white placeholder:text-gray-500 transition-all duration-200 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-black/60"
        />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-orange-400 cursor-pointer"
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
      className="mt-6 overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-1 shadow-2xl backdrop-blur-xl"
    >
      <div className="rounded-xl bg-black/80 p-5 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30">
            <Lock size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Смена пароля</h2>
            <p className="text-xs text-gray-400">Измените пароль для защиты аккаунта</p>
          </div>
        </div>

        <div className="space-y-5">
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
            className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/30 cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isChangingPassword}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
          >
            <span className="relative z-10">
              {isChangingPassword ? (
                <>
                  <span className="mr-2 inline-block animate-spin">⏳</span>
                  Сохраняем...
                </>
              ) : (
                <>
                  <span className="mr-2">🔐</span>
                  Сменить пароль
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}
