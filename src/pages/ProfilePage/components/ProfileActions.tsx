import { Camera, Lock, Settings } from 'lucide-react';

interface ProfileActionsProps {
  onEditAvatar: () => void;
  onPasswordChange: () => void;
  onSettingsClick: () => void;
}

export function ProfileActions({
  onEditAvatar,
  onPasswordChange,
  onSettingsClick,
}: ProfileActionsProps) {
  return (
    <div className="mt-8 grid grid-cols-3 gap-3">
      <button
        onClick={onEditAvatar}
        className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-linear-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 hover:border-violet-500/60 hover:from-violet-500/30 hover:to-violet-500/10 transition-colors cursor-pointer"
      >
        <div className="p-3 rounded-full bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors">
          <Camera size={20} className="text-violet-400" />
        </div>
        <span className="text-sm font-medium text-violet-400">
          Аватар
        </span>
      </button>

      <button
        onClick={onPasswordChange}
        className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-linear-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 hover:border-amber-500/60 hover:from-amber-500/30 hover:to-amber-500/10 transition-colors cursor-pointer"
      >
        <div className="p-3 rounded-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
          <Lock size={20} className="text-amber-500" />
        </div>
        <span className="text-sm font-medium text-amber-500">Пароль</span>
      </button>

      <button
        onClick={onSettingsClick}
        className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-500/60 hover:from-emerald-500/30 hover:to-emerald-500/10 transition-colors cursor-pointer"
      >
        <div className="p-3 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
          <Settings size={20} className="text-emerald-500" />
        </div>
        <span className="text-sm font-medium text-emerald-500">
          Настройки
        </span>
      </button>
    </div>
  );
}
