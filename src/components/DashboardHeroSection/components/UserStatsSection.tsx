import { PlusCircle, CheckCircle, FileText } from 'lucide-react';

interface UserStatsSectionProps {
  tierListsCount: number;
  publishedCount: number;
  draftsCount: number;
}

export function UserStatsSection({ 
  tierListsCount, 
  publishedCount, 
  draftsCount 
}: UserStatsSectionProps) {
  return (
    <section className="new-hero-stats">
      <div className="new-hero-stats__item">
        <div className="new-hero-stats__content">
          <div>
            <p className="new-hero-stats__label">Создано</p>
            <p className="new-hero-stats__value">{tierListsCount}</p>
          </div>
          <div className="new-hero-stats__icon new-hero-stats__icon--primary">
            <PlusCircle size={24} />
          </div>
        </div>
      </div>

      <div className="new-hero-stats__item">
        <div className="new-hero-stats__content">
          <div>
            <p className="new-hero-stats__label">Опубликовано</p>
            <p className="new-hero-stats__value">{publishedCount}</p>
          </div>
          <div className="new-hero-stats__icon new-hero-stats__icon--success">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      <div className="new-hero-stats__item">
        <div className="new-hero-stats__content">
          <div>
            <p className="new-hero-stats__label">Черновики</p>
            <p className="new-hero-stats__value">{draftsCount}</p>
          </div>
          <div className="new-hero-stats__icon new-hero-stats__icon--warning">
            <FileText size={24} />
          </div>
        </div>
      </div>
    </section>
  );
}
