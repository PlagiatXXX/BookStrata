import { type ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "destructive" | "success";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "ghost", size = "md", className = "", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] disabled:opacity-50 disabled:cursor-not-allowed";

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const variants = {
      primary:
        "border-[var(--ink-0)] bg-[var(--ink-0)] text-[var(--bg-0)] hover:bg-[var(--accent-main)] hover:border-[var(--accent-main)] hover:text-[var(--ink-0)] cursor-pointer",
      ghost:
        "border-transparent bg-transparent text-gray-600 dark:text-[#b8b1a3] light:text-gray-700 hover:bg-black/5 dark:hover:bg-white/8 light:hover:bg-gray-100 cursor-pointer",
      outline:
        "border-gray-300 dark:border-white/25 light:border-gray-300 bg-transparent hover:bg-gray-50 dark:hover:bg-white/8 light:hover:bg-gray-100 text-gray-700 dark:text-[#f3efe6] light:text-gray-800 cursor-pointer",
      destructive:
        "border-red-500 bg-red-500 text-white hover:bg-red-600 hover:border-red-600 cursor-pointer",
      success:
        "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 cursor-pointer",
    };

    const combinedClasses = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

    return (
      <button
        ref={ref}
        className={combinedClasses}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
