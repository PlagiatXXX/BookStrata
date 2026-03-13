import { PlusCircle, CheckCircle, FileText } from 'lucide-react';
import './UserActivityStats.css';

interface UserActivityStatsProps {
  tierListsCount: number;
  publishedCount: number;
  draftsCount: number;
}

export function UserActivityStats({ 
  tierListsCount, 
  publishedCount, 
  draftsCount 
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
                <p className="user-activity-stats__label">Создано</p>
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
        </div>
      </div>
    </section>
  );
}
