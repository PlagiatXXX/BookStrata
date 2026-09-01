import { memo } from 'react';
import type { TemplateLibraryHeaderProps } from '../types';

export const TemplateLibraryHeader = memo(({
  title,
  description,
}: TemplateLibraryHeaderProps) => {
  return (
    <div className="text-center mb-12">
      <h1 className="tpl-heading-xl mb-6">
        {title}
      </h1>
      <p className="tpl-body max-w-2xl mx-auto font-light leading-relaxed">
        {description}
      </p>
    </div>
  );
});
