import { PlusCircle, CheckCircle, FileText, BookOpen, Heart, Clock } from 'lucide-react';
import './UserActivityStats.css';

interface UserActivityStatsProps {
  tierListsCount: number;
  publishedCount: number;
  draftsCount: number;
  totalBooks: number;
  likesCount: number;
  lastActivity: string | null;
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
}: UserActivityStatsProps) {
  return (
    <section className="user-activity-stats">
      <div className="user-activity-stats__container">
        <h2 className="user-activity-stats__title">
          Моя активность
        </h2>
        
        <div className="user-activity-stats__grid">
          <div className="user-activity-stats__item">
            <div className="user-activity-stats__content">
              <div>
                <p className="user-activity-stats__label">Создано тир-листов</p>
                <p className="user-activity-stats__value">{tierListsCount}</p>
              </div>
              <div className="user-activity-stats__icon user-activity-stats__icon--primary">
                <PlusCircle size={24} />
              </div>
            </div>
          </div>

          <div className="user-activity-stats__item">
            <div className="user-activity-stats__content">
              <div>
                <p className="user-activity-stats__label">Опубликовано</p>
                <p className="user-activity-stats__value">{publishedCount}</p>
              </div>
              <div className="user-activity-stats__icon user-activity-stats__icon--success">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>

          <div className="user-activity-stats__item">
            <div className="user-activity-stats__content">
              <div>
                <p className="user-activity-stats__label">Черновики</p>
                <p className="user-activity-stats__value">{draftsCount}</p>
              </div>
              <div className="user-activity-stats__icon user-activity-stats__icon--warning">
                <FileText size={24} />
              </div>
            </div>
          </div>

          <div className="user-activity-stats__item">
            <div className="user-activity-stats__content">
              <div>
                <p className="user-activity-stats__label">Книг в подборках</p>
                <p className="user-activity-stats__value">{totalBooks}</p>
              </div>
              <div className="user-activity-stats__icon user-activity-stats__icon--info">
                <BookOpen size={24} />
              </div>
            </div>
          </div>

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
