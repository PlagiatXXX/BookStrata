interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded",
    rectangular: "rounded-md",
    circular: "rounded-full",
  };

  return (
    <div
      className={`animate-pulse bg-gray-700/50 ${variantClasses[variant]} ${className}`}
      style={{
        width: width || (variant === "text" ? "100%" : undefined),
        height: height || (variant === "text" ? "1em" : undefined),
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-linear-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-[2px] rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-2">
          <Skeleton width="60%" height="24px" className="mb-2" />
          <Skeleton width="40%" height="16px" />
        </div>
        <div className="flex gap-1">
          <Skeleton width="32px" height="32px" variant="circular" />
          <Skeleton width="32px" height="32px" variant="circular" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton width="30%" height="14px" />
        <Skeleton width="80px" height="20px" variant="circular" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton width="40px" height="40px" variant="circular" />
          <div className="flex-1">
            <Skeleton width="40%" height="16px" className="mb-1" />
            <Skeleton width="25%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTierGrid() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden ring-1 ring-surface-border bg-[#1a0d1d] shadow-2xl">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex border-b border-surface-border">
          <div className="w-24 shrink-0 p-3 bg-[#2d1531]">
            <Skeleton width="80%" height="20px" />
          </div>
          <div className="flex-1 p-3 flex gap-2 flex-wrap">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} width="60px" height="90px" variant="rectangular" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
