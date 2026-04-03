interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div
      className={`animate-spin ${sizeClasses[size]} nb-heavy-border border-t-black border-b-black border-l-[#c1fffe] border-r-[#c1fffe] ${className}`}
    />
  );
};

export default Spinner;
