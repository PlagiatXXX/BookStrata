import { memo } from 'react';
import { PlusCircle } from 'lucide-react';
import type { TemplateLibraryToolbarProps } from '../types';
import { SECTION_LABELS, SECTION_DESCRIPTIONS } from '../constants';

export const TemplateLibraryToolbar = memo(({
  activeSection,
  onCreateClick,
}: TemplateLibraryToolbarProps) => {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold text-[#f3efe6]">
          {SECTION_LABELS[activeSection]}
        </h3>
        <p className="text-sm text-[#b8b1a3]">
          {SECTION_DESCRIPTIONS[activeSection]}
        </p>
      </div>

      {activeSection === 'private' && (
        <button
          onClick={onCreateClick}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-400/20 hover:border-cyan-400/50"
          type="button"
        >
          <PlusCircle size={16} />
          Создать новый
        </button>
      )}
    </div>
  );
});