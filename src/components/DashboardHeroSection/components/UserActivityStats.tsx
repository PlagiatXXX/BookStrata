import { Layers, CheckCircle, FileText, BookOpen, Heart, Clock } from 'lucide-react';
import './UserActivityStats.css';

interface UserActivityStatsProps {
  tierListsCount: number;
  publishedCount: number;
  draftsCount: number;
  totalBooks: number;
  likesCount: number;
  lastActivity: string | null;
  onTierListsClick?: () => void;
  onPublishedClick?: () => void;
  onDraftsClick?: () => void;
  onBooksClick?: () => void;
  activeStat?: 'tierlists' | 'published' | 'drafts' | 'books' | null;
}

function formatLastActivity(date: string | null): string {
  if (!date) return "—"
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "Сегодня"
  if (days === 1) return "Вчера"
  if (days < 7) return `${days} дн. назад`
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  })
}

export function UserActivityStats({
  tierListsCount,
  publishedCount,
  draftsCount,
  totalBooks,
  likesCount,
  lastActivity,
  onTierListsClick,
  onPublishedClick,
  onDraftsClick,
  onBooksClick,
  activeStat,
}: UserActivityStatsProps) {
  return (
    <section className="user-activity-stats">
      <div className="user-activity-stats__container">
        <h2 className="user-activity-stats__title">
          Моя активность
        </h2>

        <div className="user-activity-stats__grid">
          <StatCard
            label="Создано тир-листов"
            value={tierListsCount}
            icon={<Layers size={24} />}
            iconClass="user-activity-stats__icon--primary"
            isActive={activeStat === 'tierlists'}
            onClick={onTierListsClick}
          />

          <StatCard
            label="Опубликовано"
            value={publishedCount}
            icon={<CheckCircle size={24} />}
            iconClass="user-activity-stats__icon--success"
            isActive={activeStat === 'published'}
            onClick={onPublishedClick}
          />

          <StatCard
            label="Черновики"
            value={draftsCount}
            icon={<FileText size={24} />}
            iconClass="user-activity-stats__icon--warning"
            isActive={activeStat === 'drafts'}
            onClick={onDraftsClick}
          />

          <StatCard
            label="Книг в подборках"
            value={totalBooks}
            icon={<BookOpen size={24} />}
            iconClass="user-activity-stats__icon--info"
            isActive={activeStat === 'books'}
            onClick={onBooksClick}
          />

          <div className="user-activity-stats__item">
            <div className="user-activity-stats__content">
              <div>
                <p className="user-activity-stats__label">Получено лайков</p>
                <p className="user-activity-stats__value">{likesCount}</p>
              </div>
              <div className="user-activity-stats__icon user-activity-stats__icon--like">
                <Heart size={24} />
              </div>
            </div>
          </div>

          <div className="user-activity-stats__item">
            <div className="user-activity-stats__content">
              <div>
                <p className="user-activity-stats__label">Последняя активность</p>
                <p className="user-activity-stats__value">{formatLastActivity(lastActivity)}</p>
              </div>
              <div className="user-activity-stats__icon user-activity-stats__icon--neutral">
                <Clock size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon, iconClass, isActive, onClick }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  const buttonProps = onClick ? { type: 'button' as const, onClick } : {};

  return (
    <Tag
      className={`user-activity-stats__item${isActive ? ' user-activity-stats__item--active' : ''}${onClick ? ' user-activity-stats__item--clickable' : ''}`}
      {...buttonProps}
    >
      <div className="user-activity-stats__content">
        <div>
          <p className="user-activity-stats__label">{label}</p>
          <p className="user-activity-stats__value">{value}</p>
        </div>
        <div className={`user-activity-stats__icon ${iconClass}`}>
          {icon}
        </div>
      </div>
    </Tag>
  );
}
