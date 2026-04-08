interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-[1.5px]",
    md: "h-6 w-6 border-2",
    lg: "h-9 w-9 border-2",
    xl: "h-12 w-12 border-[3px]",
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-spin rounded-full border-solid border-t-transparent text-(--accent-main) ${sizeClasses[size]} ${className}`}
      style={{
        animationDuration: "0.9s",
        borderColor: "currentColor",
        borderTopColor: "transparent",
        boxShadow: "0 0 10px color-mix(in srgb, var(--accent-main) 45%, transparent)",
      }}
    />
  );
};

export default Spinner;
