import { useState } from 'react';
import { getInitials, getInitialsColor } from './presets';
import { logger } from '@/lib/logger';

interface AvatarProps {
  url?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-32 h-32 text-3xl',
};

export function Avatar({ url, username, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(username);
  const initialsColor = getInitialsColor(username);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Сбрасываем состояние при изменении URL
  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    logger.warn('Failed to load avatar', { url });
    setHasError(true);
    setIsLoaded(false);
    // Очищаем src чтобы избежать повторных попыток загрузки
    (e.target as HTMLImageElement).src = '';
  };

  // Если нет URL или произошла ошибка - показываем инициалы
  if (!url || hasError) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-linear-to-br ${initialsColor} flex items-center justify-center font-bold text-white shadow-inner ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={username ? `${username}'s avatar` : 'Avatar'}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-surface-border bg-surface-light dark:bg-[#200f24] light:bg-gray-100 ${className}`}
      loading="lazy"
      onLoad={handleImageLoad}
      onError={handleImageError}
      style={{ opacity: isLoaded || hasError ? 1 : 0 }}
    />
  );
}
