import React, { type JSX } from 'react';
import { getTailwindTextColorClass } from '@/utils/colorUtils';

interface AdaptiveTextProps {
  children: React.ReactNode;
  backgroundColor?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements; // Allows using as different HTML elements
}

export const AdaptiveText: React.FC<AdaptiveTextProps> = ({
  children,
  backgroundColor = '#ffffff',
  className = '',
  as: Component = 'span',
}) => {
  const textColorClass = getTailwindTextColorClass(backgroundColor);
  
  const combinedClassName = `${textColorClass} ${className}`.trim();

  return <Component className={combinedClassName}>{children}</Component>;
};