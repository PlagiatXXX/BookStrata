import { useQuery } from "@tanstack/react-query";
import { apiGetMyAchievements, apiGetMyAchievementStatus } from "@/lib/achievementApi";
import { getAuthToken } from "@/lib/authApi";

export function useAchievements() {
  const hasToken = Boolean(getAuthToken());

  const achievementsQuery = useQuery({
    queryKey: ["achievements", "me"],
    queryFn: apiGetMyAchievements,
    enabled: hasToken,
  });

  const statusQuery = useQuery({
    queryKey: ["achievements", "status"],
    queryFn: apiGetMyAchievementStatus,
    enabled: hasToken,
  });

  return {
    achievements: achievementsQuery.data || [],
    status: statusQuery.data,
    isLoading: achievementsQuery.isLoading || statusQuery.isLoading,
  };
}
