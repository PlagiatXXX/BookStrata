import { useRef } from "react";
import { PlusCircle, Globe, LogOut } from "lucide-react";
import BookScene from "./BookScene";
import "./BookScene.css";

interface HeroSectionProps {
  username: string;
  onCreateClick: () => void;
  onCommunityClick: () => void;
  onLogoutClick: () => void;
}

export default function HeroSectionClassic({
  username,
  onCreateClick,
  onCommunityClick,
  onLogoutClick,
}: HeroSectionProps) {
  const bookContainerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="hero" ref={bookContainerRef}>
      <div className="hero-utility">
        <button
          onClick={onLogoutClick}
          className="hero-logout-btn"
          type="button"
          aria-label="Выйти"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
      <div className="hero-card">
        <div className="hero-inner">
          {/* Left Content */}
          <div className="hero-left">
            <p className="hero-chip">Добро пожаловать, {username}</p>

            <h1>
              <span className="line-brown">Твой уютный уголок</span>
              <span className="line-purple">для чтения</span>
            </h1>

            <p className="hero-subtitle">
              Создавай свои рейтинги книг в атмосфере тепла и уюта. Делись впечатлениями и находи вдохновение среди единомышленников.
            </p>

            <div className="hero-actions">
              <button
                onClick={onCreateClick}
                className="hero-btn hero-btn--primary"
                type="button"
              >
                <PlusCircle size={18} />
                Создать тир-лист
              </button>

              <button
                onClick={onCommunityClick}
                className="hero-btn hero-btn--ghost"
                type="button"
              >
                <Globe size={18} />
                Смотреть тренды
              </button>
            </div>
          </div>

          <div className="hero-right">
            <BookScene containerRef={bookContainerRef} />
          </div>
        </div>
      </div>
    </section>
  );
}
