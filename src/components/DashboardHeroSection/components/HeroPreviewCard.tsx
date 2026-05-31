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
                backgroundImage: "url('/book-covers/default/book-1.webp')" 
              }}
              aria-label="Обложка книги"
            />
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('/book-covers/default/book-2.webp')" 
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
                backgroundImage: "url('/book-covers/default/book-3.webp')" 
              }}
              aria-label="Обложка книги"
            />
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('/book-covers/default/book-4.webp')" 
              }}
              aria-label="Обложка книги"
            />
            <div 
              className="new-hero-preview__book"
              style={{ 
                backgroundImage: "url('/book-covers/default/book-5.webp')" 
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
                backgroundImage: "url('/book-covers/default/book-6.webp')" 
              }}
              aria-label="Обложка книги"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
