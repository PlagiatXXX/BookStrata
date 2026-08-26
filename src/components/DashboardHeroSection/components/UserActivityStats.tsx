/* eslint-disable react-refresh/only-export-components */
import {
  Layers,
  CheckCircle,
  FileText,
  BookOpen,
  Heart,
  Timer,
} from "lucide-react";

interface UserActivityStatsProps {
  tierListsCount: number;
  publishedCount: number;
  draftsCount: number;
  totalBooks: number;
  likesCount: number;
  totalActiveMinutes: number;
  onTierListsClick?: () => void;
  onPublishedClick?: () => void;
  onDraftsClick?: () => void;
  onBooksClick?: () => void;
  activeStat?: "tierlists" | "published" | "drafts" | "books" | null;
}

export function UserActivityStats({
  tierListsCount,
  publishedCount,
  draftsCount,
  totalBooks,
  likesCount,
  totalActiveMinutes,
  onTierListsClick,
  onPublishedClick,
  onDraftsClick,
  onBooksClick,
  activeStat,
}: UserActivityStatsProps) {
  return (
    <div className="activity-stats grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard
        label="Создано тир-листов"
        value={tierListsCount}
        icon={<Layers size={22} />}
        accent="#38bdf8"
        isActive={activeStat === "tierlists"}
        onClick={onTierListsClick}
      />
      <StatCard
        label="Опубликовано"
        value={publishedCount}
        icon={<CheckCircle size={22} />}
        accent="#4ade80"
        isActive={activeStat === "published"}
        onClick={onPublishedClick}
      />
      <StatCard
        label="Черновики"
        value={draftsCount}
        icon={<FileText size={22} />}
        accent="#fbbf24"
        isActive={activeStat === "drafts"}
        onClick={onDraftsClick}
      />
      <StatCard
        label="Книг в подборках"
        value={totalBooks}
        icon={<BookOpen size={22} />}
        accent="#a78bfa"
        isActive={activeStat === "books"}
        onClick={onBooksClick}
      />
      <StatCard
        label="Получено лайков"
        value={likesCount}
        icon={<Heart size={22} />}
        accent="#f87171"
      />
      <StatCard
        label="Время на сайте"
        value={formatTotalMinutes(totalActiveMinutes)}
        icon={<Timer size={22} />}
        accent="#22d3ee"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string; // hex
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({
  label,
  value,
  icon,
  accent,
  isActive,
  onClick,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`activity-stat flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 sm:gap-4 sm:p-4 ${
        onClick ? "cursor-pointer hover:bg-white/[0.09]" : "cursor-default"
      }`}
      style={{
        borderColor: isActive ? `${accent}99` : `${accent}59`,
        backgroundColor: isActive ? `${accent}2e` : `${accent}1f`,
        boxShadow: isActive ? `0 0 20px ${accent}4d` : `0 0 14px ${accent}1f`,
      }}
    >
      <span
        className="activity-stat__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12"
        style={{
          background: `${accent}30`,
          color: accent,
          boxShadow: `0 0 16px ${accent}52`,
        }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-gray-100 sm:text-[13px]">
          {label}
        </span>
        <span className="block text-2xl font-bold leading-tight text-white">
          {value}
        </span>
      </span>
    </button>
  );
}

export function formatTotalMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}
