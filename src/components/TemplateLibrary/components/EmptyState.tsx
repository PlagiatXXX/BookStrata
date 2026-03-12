import { Archive, FileText, Globe, Star } from 'lucide-react';
import type { SectionKey } from '../templateLibraryReducer';

interface EmptyStateProps {
  section: SectionKey;
  hasSearch: boolean;
}

const ICONS: Record<SectionKey, typeof FileText> = {
  private: FileText,
  public: Globe,
  favorites: Star,
  archived: Archive,
};

const TITLES: Record<SectionKey, string> = {
  private: 'Нет шаблонов',
  public: 'Нет публичных тир-листов',
  favorites: 'Нет избранных',
  archived: 'Нет архивных',
};

export function EmptyState({ section, hasSearch }: EmptyStateProps) {
  const Icon = ICONS[section];

  return (
    <div className="rounded-md border border-white/20 bg-black/30 py-12 text-center">
      <div className="mb-6">
        <Icon size={56} className="mx-auto text-[#b8b1a3]" />
      </div>
      <h3 className="mb-2 font-display text-xl font-medium text-[#f3efe6]">
        {hasSearch ? 'Ничего не найдено' : TITLES[section]}
      </h3>
      <p className="mb-6 text-[#b8b1a3]">
        {hasSearch
          ? 'Попробуйте сменить раздел, категорию или строку поиска.'
          : 'Попробуйте зайти позже.'}
      </p>
    </div>
  );
}
