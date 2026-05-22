import { memo } from 'react';
import type { TemplateLibraryToolbarProps } from '../types';
import { SECTION_LABELS, SECTION_DESCRIPTIONS } from '../constants';

export const TemplateLibraryToolbar = memo(({
  activeSection,
}: TemplateLibraryToolbarProps) => {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-[#f3efe6]">
        {SECTION_LABELS[activeSection]}
      </h3>
      <p className="text-sm text-[#b8b1a3]">
        {SECTION_DESCRIPTIONS[activeSection]}
      </p>
    </div>
  );
});