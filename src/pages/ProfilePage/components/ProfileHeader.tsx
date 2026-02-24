import { Camera, Edit2, Save, X, User as UserIcon, Calendar } from 'lucide-react';
import { Avatar } from '@/components/Avatar';

interface ProfileHeaderProps {
  user?: {
    avatarUrl: string | null;
    email: string;
    createdAt: string;
  };
  username?: string;
  isEditingUsername: boolean;
  newUsername: string;
  isSavingUsername: boolean;
  onEditAvatar: () => void;
  onStartEditUsername: () => void;
  onCancelEditUsername: () => void;
  onSaveUsername: () => void;
  onUsernameChange: (value: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function ProfileHeader({
  user,
  username,
  isEditingUsername,
  newUsername,
  isSavingUsername,
  onEditAvatar,
  onStartEditUsername,
  onCancelEditUsername,
  onSaveUsername,
  onUsernameChange,
}: ProfileHeaderProps) {
  return (
    <div className="rounded-2xl bg-[#1a1a2e] p-5 shadow-xl dark:bg-[#1a1a2e] light:bg-white sm:p-8">
      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <Avatar
            url={user?.avatarUrl}
            username={username}
            size="xl"
            className="h-28 w-28 text-3xl sm:h-32 sm:w-32 sm:text-4xl"
          />
          <button
            onClick={onEditAvatar}
            className="absolute bottom-0 right-0 rounded-full bg-primary p-3 text-white shadow-lg opacity-100 transition-opacity cursor-pointer hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Camera size={18} />
          </button>
        </div>
      </div>

      {/* Username with Edit */}
      <div className="flex flex-col items-center mb-2">
        {isEditingUsername ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:flex-nowrap">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="w-full rounded-lg bg-surface-light px-4 py-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#2d2d44] dark:text-white light:bg-gray-100 light:text-gray-900 sm:w-auto"
              placeholder="Введите имя"
              maxLength={20}
            />
            <button
              onClick={onSaveUsername}
              disabled={isSavingUsername || !newUsername.trim()}
              className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={18} />
            </button>
            <button
              onClick={onCancelEditUsername}
              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white dark:text-white light:text-gray-900">
              {username}
            </h1>
            <button
              onClick={onStartEditUsername}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Edit2 size={16} />
            </button>
          </div>
        )}
        <p className="break-all text-center text-gray-400">{user?.email}</p>
      </div>

      {/* User Info */}
      <div className="space-y-4 mt-8">
        <div className="flex items-center gap-4 p-4 bg-surface-light dark:bg-[#200f24] light:bg-gray-50 rounded-xl">
          <UserIcon className="text-primary" size={20} />
          <div>
            <p className="text-sm text-gray-400">Имя пользователя</p>
            <p className="text-white dark:text-white light:text-gray-900 font-medium">
              {username || 'Не указано'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-surface-light dark:bg-[#200f24] light:bg-gray-50 rounded-xl">
          <Calendar className="text-primary" size={20} />
          <div>
            <p className="text-sm text-gray-400">Дата регистрации</p>
            <p className="text-white dark:text-white light:text-gray-900 font-medium">
              {user?.createdAt ? formatDate(user.createdAt) : 'Неизвестно'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
