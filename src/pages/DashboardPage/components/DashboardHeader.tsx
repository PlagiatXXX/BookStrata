import HeroSection from '@/components/HeroSection/HeroSection';
import type { DashboardHeaderProps } from '../types';

export function DashboardHeader({
  username,
  onCreateClick,
  onCommunityClick,
  onLogoutClick,
}: DashboardHeaderProps) {
  return (
    <>
      <HeroSection
        username={username}
        onCreateClick={onCreateClick}
        onCommunityClick={onCommunityClick}
        onLogoutClick={onLogoutClick}
      />

      <div className="dashboard-divider">
        <span>Ваши рейтинги</span>
      </div>
    </>
  );
}
