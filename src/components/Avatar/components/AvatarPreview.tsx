import { Check } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Avatar } from "../Avatar";
import type { AvatarPreviewProps } from "../types";

export function AvatarPreview({
  currentUrl,
  username,
  hasSelection,
  isBusy,
  busyLabel = "Загружаем...",
}: AvatarPreviewProps) {
  const avatarUrl: string | null = currentUrl ?? null;

  return (
    <div className="flex justify-center mb-6">
      <div className="relative">
        <Avatar url={avatarUrl} username={username} size="xl" />
        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <div className="flex flex-col items-center gap-2">
              <Spinner
                size="lg"
                className="border-white/25 border-t-white border-l-white"
              />
              <span className="text-xs font-medium text-white">{busyLabel}</span>
            </div>
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
