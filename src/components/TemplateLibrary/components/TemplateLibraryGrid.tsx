import TemplateCard from '../../TemplateCard/TemplateCard';
import type { TemplateLibraryGridProps } from '../types';
import { COVER_HEIGHTS } from '../constants';

export function TemplateLibraryGrid({
  templates,
  viewMode,
  onEdit,
  onDelete,
  coverHeights,
}: TemplateLibraryGridProps) {
  if (viewMode === 'masonry') {
    return (
      <div className="w-full columns-1 gap-4 sm:columns-2 xl:columns-4">
        {templates.map((template, index) => (
          <div key={template.id} className="break-inside-avoid">
            <TemplateCard
              template={template}
              onEdit={onEdit}
              onDelete={onDelete}
              variant="cover"
              coverHeight={coverHeights[index % coverHeights.length]}
            />
          </div>
        ))}
      </div>
    );
  }

  // Compact view
  return (
    <div className="w-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
