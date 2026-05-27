import { memo } from 'react';
import type { TemplateLibraryHeaderProps } from '../types';

export const TemplateLibraryHeader = memo(({
  title,
  description,
}: TemplateLibraryHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-[#f3efe6] md:text-4xl lg:text-5xl">
        {title}
      </h1>
      <p className="text-base text-[#b8b1a3]">{description}</p>
      <div className="mt-4 h-1 w-24 bg-linear-to-r from-cyan-400 to-transparent rounded-full" />
    </div>
  );
});
