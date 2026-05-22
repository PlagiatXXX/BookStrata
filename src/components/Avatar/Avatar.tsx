import { useState } from "react";
import { getInitials, getInitialsColor } from "./presets";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Avatar", { color: "blue" });

interface AvatarProps {
  url?: string | null;
  username?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isPro?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-32 h-32 text-3xl",
};

const crownSizes: Record<string, string> = {
  xs: "w-3.5 h-3.5 -top-1 -right-1",
  sm: "w-4 h-4 -top-1 -right-1",
  md: "w-5 h-5 -top-1.5 -right-1.5",
  lg: "w-6 h-6 -top-1.5 -right-1.5",
  xl: "w-8 h-8 -top-2 -right-2",
};

function CrownIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
    >
      <path
        d="M2 19h20v-2H2v2zm1.5-4l3.5-9 4.5 5.5L16 6l3.5 9H3.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Avatar({
  url,
  username,
  size = "md",
  className = "",
  isPro = false,
}: AvatarProps) {
  const initials = getInitials(username);
  const initialsColor = getInitialsColor(username);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const hasError = !!url && failedUrl === url;
  const isLoaded = !!url && loadedUrl === url;

  const handleImageLoad = () => {
    setLoadedUrl(url ?? null);
    setFailedUrl(null);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    logger.warn("Failed to load avatar", { url });
    setFailedUrl(url ?? null);
    setLoadedUrl(null);
    (e.target as HTMLImageElement).src = "";
  };

  const avatarEl = !url || hasError ? (
    <div
      className={`${sizeClasses[size]} rounded-full bg-linear-to-br ${initialsColor} flex items-center justify-center font-bold text-white shadow-inner ${className}`}
    >
      {initials}
    </div>
  ) : (
    <img
      src={url}
      alt={username ? `${username}'s avatar` : "Avatar"}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-surface-border bg-surface-light dark:bg-[#200f24] light:bg-gray-100 ${className}`}
      loading="lazy"
      onLoad={handleImageLoad}
      onError={handleImageError}
      style={{ opacity: isLoaded || hasError ? 1 : 0 }}
    />
  );

  if (!isPro) return avatarEl;

  return (
    <div className="relative inline-flex">
      {avatarEl}
      <CrownIcon
        className={`absolute ${crownSizes[size]} text-yellow-400 -rotate-12`}
      />
    </div>
  );
}
