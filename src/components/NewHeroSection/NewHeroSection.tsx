import { PlusCircle, TrendingUp } from 'lucide-react';
import { HeroPreviewCard } from './components/HeroPreviewCard';
import './NewHeroSection.css';

interface NewHeroSectionProps {
  username: string;
  onCreateClick: () => void;
  onCommunityClick: () => void;
}

export function NewHeroSection({
  username,
  onCreateClick,
  onCommunityClick,
}: NewHeroSectionProps) {
  return (
    <section className="new-hero">
      <div className="new-hero__container">
        <div className="new-hero__grid">
          {/* Left Content */}
          <div className="new-hero__content">
            <div className="new-hero__header">
              <span className="new-hero__chip">Панель управления</span>
              <h1 className="new-hero__title">
                Добро пожаловать, <span className="new-hero__highlight">{username}</span>
              </h1>
              <p className="new-hero__subtitle">Твой уютный уголок для чтения</p>
              <p className="new-hero__description">
                Создавай свои рейтинги книг в атмосфере тепла и уюта. Делись впечатлениями и находи 
                вдохновение среди единомышленников.
              </p>
            </div>

            <div className="new-hero__actions">
              <button
                onClick={onCreateClick}
                className="new-hero__btn new-hero__btn--primary"
                type="button"
              >
                <PlusCircle size={18} />
                Создать тир-лист
              </button>

              <button
                onClick={onCommunityClick}
                className="new-hero__btn new-hero__btn--secondary"
                type="button"
              >
                <TrendingUp size={18} />
                Смотреть тренды
              </button>
            </div>
          </div>

          {/* Right Content - Preview Card */}
          <div className="new-hero__preview">
            <HeroPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}
