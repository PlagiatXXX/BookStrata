import React, { memo } from 'react';
import type { Template } from '@/types/templates';
import { Button } from '@/ui/Button';

export interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  viewMode?: 'grid' | 'list';
  coverHeight?: number;
  variant?: string;
}

const TemplateCard = memo(({ template, onEdit, onDelete, viewMode = 'grid' }: TemplateCardProps) => {
  const isList = viewMode === 'list';
  const imageUrl = template.previewImageUrl || '/images/templates/placeholder.webp';

  return (
    <div className={`brutal-card p-4 flex ${isList ? 'flex-row items-center justify-between' : 'flex-col gap-3'}`}>
      <div className="flex items-center gap-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={template.title}
            className="w-12 h-12 object-cover brutal-border"
          />
        )}
        <div>
          <h4 className="font-bold">{template.title}</h4>
          <p className="text-xs opacity-60">{template.category || 'Без категории'}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(template)}>Изм.</Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(template)} className="text-red-500">Удал.</Button>
      </div>
    </div>
  );
});

export default TemplateCard;
