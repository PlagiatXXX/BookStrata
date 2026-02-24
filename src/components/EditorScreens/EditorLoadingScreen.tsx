import { Skeleton, SkeletonTierGrid } from "@/ui/Skeleton";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";

interface EditorLoadingScreenProps {
  onMyRatingsClick: () => void;
}

export function EditorLoadingScreen({ onMyRatingsClick }: EditorLoadingScreenProps) {
  return (
    <DashboardLayout
      onMyRatingsClick={onMyRatingsClick}
      onSearch={() => {}}
      searchValue=""
    >
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6">
            <Skeleton width="40%" height="32px" className="mb-2" />
            <Skeleton width="25%" height="16px" />
          </div>

          {/* Tier Grid skeleton */}
          <SkeletonTierGrid />
        </div>
      </main>
    </DashboardLayout>
  );
}
