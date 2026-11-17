import { useQuery } from "@tanstack/react-query"
import { apiGetUserAchievements } from "@/lib/achievementApi"

/** Достижения публичного профиля пользователя (только полученные). */
export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ["userAchievements", userId],
    queryFn: () => apiGetUserAchievements(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })
}
