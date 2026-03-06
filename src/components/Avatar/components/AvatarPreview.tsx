import { Avatar } from '../Avatar';
import { Spinner } from '@/components/Spinner';
import { Check } from 'lucide-react';
import type { AvatarPreviewProps } from '../types';

export function AvatarPreview({
  currentUrl,
  username,
  hasSelection,
  isBusy,
}: AvatarPreviewProps) {
  const showLoading = isBusy;

  // currentUrl может быть undefined, приводим к string | null
  const avatarUrl: string | null = currentUrl ?? null;

  return (
    <div className="flex justify-center mb-6">
      <div className="relative">
        <Avatar url={avatarUrl} username={username} size="xl" />
        {showLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Spinner size="lg" />
          </div>
        )}
        {hasSelection && (
          <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
            <Check size={16} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
