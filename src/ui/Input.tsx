import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      {...props}
      className={`flex h-10 w-full rounded-md border border-gray-300 dark:border-white/25 light:border-gray-300 bg-white/95 dark:bg-black/35 light:bg-white px-3 py-2 text-sm text-gray-900 dark:text-[#f3efe6] light:text-gray-900 placeholder:text-gray-500 dark:placeholder:text-[#b8b1a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-main)] disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
    />
  );
};
