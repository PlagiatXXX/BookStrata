import { Library, TrendingUp } from "lucide-react";
import { HeroPreviewCard } from "./components/HeroPreviewCard";
import "./DashboardHeroSection.css";

interface DashboardHeroSectionProps {
  username: string;
  onCreateClick: () => void;
  onCommunityClick: () => void;
}

export function DashboardHeroSection({
  username,
  onCreateClick,
  onCommunityClick,
}: DashboardHeroSectionProps) {
  return (
    <section className="new-hero">
      <div className="new-hero__container">
        <div className="new-hero__grid">
          {/* Left Content */}
          <div className="new-hero__content">
            <div className="new-hero__header">
              <span className="new-hero__chip">Панель управления</span>
              <h1 className="new-hero__title">
                Добро пожаловать,{" "}
                <span className="new-hero__highlight">{username}</span>
              </h1>
              <p className="new-hero__subtitle">
                В свой уютный уголок
              </p>
              <p className="new-hero__description">
                Создавай свои рейтинги книг в атмосфере тепла и уюта. Делись
                впечатлениями и находи вдохновение среди единомышленников.
              </p>
            </div>

            <div className="new-hero__actions">
              <button
                data-analytics="cta.dashboard.create_tierlist"
                onClick={onCreateClick}
                className="new-hero__btn new-hero__btn--primary"
                type="button"
              >
                <Library size={16} />
                Создать тир-лист
              </button>

              <button
                data-analytics="cta.dashboard.view_trends"
                onClick={onCommunityClick}
                className="new-hero__btn new-hero__btn--secondary"
                type="button"
              >
                <TrendingUp size={16} />
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
