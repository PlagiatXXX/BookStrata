export function HeroPreviewCard() {
  return (
    <div className="new-hero-preview">
      <div className="new-hero-preview__header">
        <div className="new-hero-preview__title">
          <span>Превью рейтинга</span>
        </div>
        {/* macOS-style window controls */}
        <div className="new-hero-preview__controls">
          <span className="new-hero-preview__control new-hero-preview__control--close" />
          <span className="new-hero-preview__control new-hero-preview__control--minimize" />
          <span className="new-hero-preview__control new-hero-preview__control--maximize" />
        </div>
      </div>

      <div className="new-hero-preview__content">
        {/* Tier S */}
        <div className="new-hero-preview__tier">
          <div className="new-hero-preview__tier-label new-hero-preview__tier-label--s">
            S
          </div>
          <div className="new-hero-preview__books">
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop')" 
              }}
              aria-label="Обложка книги"
            />
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200&h=300&fit=crop')" 
              }}
              aria-label="Обложка книги"
            />
          </div>
        </div>

        {/* Tier A */}
        <div className="new-hero-preview__tier">
          <div className="new-hero-preview__tier-label new-hero-preview__tier-label--a">
            A
          </div>
          <div className="new-hero-preview__books">
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=300&fit=crop')" 
              }}
              aria-label="Обложка книги"
            />
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&h=300&fit=crop')" 
              }}
              aria-label="Обложка книги"
            />
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&h=300&fit=crop')" 
              }}
              aria-label="Обложка книги"
            />
          </div>
        </div>

        {/* Tier B */}
        <div className="new-hero-preview__tier">
          <div className="new-hero-preview__tier-label new-hero-preview__tier-label--b">
            B
          </div>
          <div className="new-hero-preview__books">
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1532012197267-da84d127e765?w=200&h=300&fit=crop')" 
              }}
              aria-label="Обложка книги"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
