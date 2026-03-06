import { LayoutGrid, Plus, Rows3 } from 'lucide-react';
import { Button } from '@/ui/Button';
import type { TemplateLibraryToolbarProps } from '../types';
import { SECTION_LABELS, SECTION_DESCRIPTIONS, VIEW_MODE_LABELS } from '../constants';

export function TemplateLibraryToolbar({
  activeSection,
  viewMode,
  onViewModeChange,
  onCreateClick,
}: TemplateLibraryToolbarProps) {
  const isPublicSection = activeSection === 'public';

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {/* Заголовок секции */}
      <div>
        <h3 className="text-lg font-semibold text-[#f3efe6]">
          {SECTION_LABELS[activeSection]}
        </h3>
        <p className="text-sm text-[#b8b1a3]">
          {SECTION_DESCRIPTIONS[activeSection]}
        </p>
      </div>

      {/* Действия */}
      {!isPublicSection && (
        <div className="flex items-center gap-2">
          {/* Переключатель режима просмотра */}
          <div className="flex rounded-xl border border-cyan-900/80 bg-[#031923]/80 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange('masonry')}
              className={`rounded-lg p-2 ${viewMode === 'masonry' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300'}`}
              aria-label={VIEW_MODE_LABELS.masonry}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              className={`rounded-lg p-2 ${viewMode === 'compact' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300'}`}
              aria-label={VIEW_MODE_LABELS.compact}
            >
              <Rows3 size={16} />
            </button>
          </div>

          {/* Кнопка создания */}
          <Button onClick={onCreateClick} size="sm">
            <Plus size={14} />
            Создать шаблон
          </Button>
        </div>
      )}
    </div>
  );
}
