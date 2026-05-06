import {
  Camera,
  Edit2,
  Save,
  X,
  User as UserIcon,
  Calendar,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";

interface ProfileHeaderProps {
  user?: {
    avatarUrl: string | null;
    email: string;
    createdAt: string;
    xp?: number;
    title?: string;
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
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
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
    <div className="rounded-2xl bg-[#1a1a2e] p-4 shadow-xl dark:bg-[#1a1a2e] light:bg-white sm:p-6 md:p-8">
      {/* Header Section - Horizontal Layout */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {/* Avatar - Centered on mobile, left on desktop */}
        <div className="relative group flex shrink-0 justify-center sm:justify-start">
          <Avatar
            url={user?.avatarUrl}
            username={username}
            size="xl"
            className="h-24 w-24 text-3xl sm:h-28 sm:w-28 sm:text-3xl md:h-32 md:w-32 md:text-4xl"
          />
          <button
            onClick={onEditAvatar}
            className="absolute bottom-0 right-1 flex items-center justify-center rounded-full bg-primary p-2 text-white shadow-lg opacity-100 transition-opacity cursor-pointer hover:scale-110 sm:p-2.5 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Camera size={14} className="sm:size-4" />
          </button>
        </div>

        {/* User Info - Centered on mobile, left on desktop */}
        <div className="flex-1 text-center sm:text-left">
          {/* Username with Edit */}
          <div className="mb-2">
            {isEditingUsername ? (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  className="w-full sm:w-auto rounded-lg bg-surface-light px-4 py-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#2d2d44] dark:text-white light:bg-gray-100 light:text-gray-900"
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
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl font-bold text-white dark:text-white light:text-gray-900 sm:text-2xl">
                  {username}
                </h1>
                <button
                  onClick={onStartEditUsername}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Edit2 size={16} className="sm:size-5" />
                </button>
              </div>
            )}
            <p className="break-all text-gray-400 mt-1 text-sm">
              {user?.email}
            </p>
          </div>

          {/* XP Progress Bar */}
          <div className="mb-6 max-w-md mx-auto sm:mx-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                {user?.title || "Новичок"}
              </span>
              <span className="text-xs font-bold text-gray-400">
                {user?.xp || 0} XP
              </span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] transition-all duration-500"
                style={{ width: `${Math.min(((user?.xp || 0) / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* User Info Cards - Stacked on mobile, 2 columns on desktop */}
          <div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-2 sm:gap-3">
            <div className="flex items-center gap-2 p-2.5 bg-surface-light dark:bg-[#200f24] light:bg-gray-50 rounded-lg sm:p-3 sm:gap-3">
              <UserIcon className="text-primary shrink-0 sm:size-5" size={16} />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Имя пользователя</p>
                <p className="text-sm text-white dark:text-white light:text-gray-900 font-medium truncate">
                  {username || "Не указано"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-surface-light dark:bg-[#200f24] light:bg-gray-50 rounded-lg sm:p-3 sm:gap-3">
              <Calendar className="text-primary shrink-0 sm:size-5" size={16} />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Дата регистрации</p>
                <p className="text-sm text-white dark:text-white light:text-gray-900 font-medium truncate">
                  {user?.createdAt ? formatDate(user.createdAt) : "Неизвестно"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
