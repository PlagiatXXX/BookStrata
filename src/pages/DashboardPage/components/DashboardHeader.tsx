import { DashboardHeroSection } from "@/components/DashboardHeroSection/DashboardHeroSection";
import type { DashboardHeaderProps } from "../types";

export function DashboardHeader({
  username,
  onCreateClick,
  onCommunityClick,
}: DashboardHeaderProps) {
  return (
    <DashboardHeroSection
      username={username}
      onCreateClick={onCreateClick}
      onCommunityClick={onCommunityClick}
    />
  );
}
