import { NewHeroSection } from '@/components/NewHeroSection/NewHeroSection';
import type { DashboardHeaderProps } from '../types';

export function DashboardHeader({
  username,
  onCreateClick,
  onCommunityClick,
  onLogoutClick,
}: DashboardHeaderProps) {
  return (
    <NewHeroSection
      username={username}
      onCreateClick={onCreateClick}
      onCommunityClick={onCommunityClick}
    />
  );
}
