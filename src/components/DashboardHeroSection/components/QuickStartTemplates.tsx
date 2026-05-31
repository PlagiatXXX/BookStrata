import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './QuickStartTemplates.css';

interface Template {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

const templates: Template[] = [
  {
    id: 'fiction',
    title: 'Fiction',
    subtitle: 'Художественная литература',
    imageUrl: '/book-covers/default/template-fiction.webp',
  },
  {
    id: 'sci-fi',
    title: 'Sci-Fi',
    subtitle: 'Научная фантастика',
    imageUrl: '/book-covers/default/template-scifi.webp',
  },
  {
    id: 'detectives',
    title: 'Detectives',
    subtitle: 'Детективы и триллеры',
    imageUrl: '/book-covers/default/template-detectives.webp',
  },
  {
    id: 'non-fiction',
    title: 'Non-fiction',
    subtitle: 'Документалистика',
    imageUrl: '/book-covers/default/template-nonfiction.webp',
  },
];

export function QuickStartTemplates() {
  const navigate = useNavigate();

  return (
    <section className="quick-start-templates">
      <div className="quick-start-templates__container">
        <div className="quick-start-templates__header">
          <h2 className="quick-start-templates__title">
            <Zap size={24} className="quick-start-templates__icon" />
            Шаблоны быстрого старта
          </h2>
          <button 
            className="quick-start-templates__link"
            onClick={() => navigate('/templates')}
            type="button"
          >
            Все шаблоны →
          </button>
        </div>

        <div className="quick-start-templates__grid">
          {templates.map((template) => (
            <button
              key={template.id}
              className="quick-start-templates__card"
              onClick={() => navigate('/templates')}
              type="button"
            >
              <div 
                className="quick-start-templates__card-image"
                style={{ backgroundImage: `url(${template.imageUrl})` }}
              />
              <div className="quick-start-templates__card-overlay" />
              <div className="quick-start-templates__card-content">
                <p className="quick-start-templates__card-title">{template.title}</p>
                <p className="quick-start-templates__card-subtitle">{template.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
