import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      {...props}
      className={`flex min-h-20 w-full rounded-md border border-gray-300 dark:border-white/25 light:border-gray-300 bg-white/95 dark:bg-black/35 light:bg-white px-3 py-2 text-sm text-gray-900 dark:text-[#f3efe6] light:text-gray-900 placeholder:text-gray-500 dark:placeholder:text-[#b8b1a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-main) disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
    />
  );
};
