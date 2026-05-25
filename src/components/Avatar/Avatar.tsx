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
  xs: "w-[14px] h-[14px] -top-1 -right-1",
  sm: "w-[18px] h-[18px] -top-1 -right-1",
  md: "w-[22px] h-[22px] -top-1.5 -right-1.5",
  lg: "w-[32px] h-[32px] -top-2 -right-2",
  xl: "w-[72px] h-[72px] -top-4 -right-4",
};

function CrownIcon({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
    >
      <defs>
        <linearGradient id="crown-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE07D" />
          <stop offset="50%" stopColor="#F1A80A" />
          <stop offset="100%" stopColor="#935500" />
        </linearGradient>
      </defs>
      <g transform="rotate(12, 60, 65)">
        <path d="M 25,75 Q 60,83 95,75 L 92,65 Q 60,73 28,65 Z" fill="url(#crown-gold)" />
        <path d="M 28,65 L 20,35 L 42,52 L 60,20 L 78,52 L 100,35 L 92,65 Q 60,73 28,65 Z" fill="url(#crown-gold)" />
        <circle cx="20" cy="35" r="3.5" fill="url(#crown-gold)" />
        <circle cx="60" cy="20" r="4.5" fill="url(#crown-gold)" />
        <circle cx="100" cy="35" r="3.5" fill="url(#crown-gold)" />
      </g>
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
        className={`absolute ${crownSizes[size]}`}
      />
    </div>
  );
}
