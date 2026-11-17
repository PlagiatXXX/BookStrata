/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "./api-client";
import { handleResponse } from "./authApi";
import { createLogger } from "./logger";
import { triggerAchievementNotification } from "@/hooks/useAchievementNotifications";

const achievementLogger = createLogger("AchievementApi", { color: "yellow" });

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl?: string;
  xpValue: number;
  isEarned: boolean;
  earnedAt: string | null;
  isSecret: boolean;
  progress?: { current: number; target: number } | null;
}

/** Достижение из публичного профиля другого пользователя (GET /users/:id/achievements). */
export interface PublicAchievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string | null;
  xpValue: number;
  /** ISO-строка даты получения. */
  earnedAt: string;
}

export interface AchievementStatus {
  xp: number;
  title: string;
  icon: string;
}

export async function apiGetMyAchievements(): Promise<Achievement[]> {
  achievementLogger.info("Получение достижений пользователя");
  return apiClient.get<Achievement[]>("/achievements/me");
}

/** Публичные (полученные) достижения пользователя для его профиля. */
export async function apiGetUserAchievements(
  userId: string,
): Promise<PublicAchievement[]> {
  achievementLogger.info("Получение публичных достижений", { userId });
  return apiClient.get<PublicAchievement[]>(
    `/users/${userId}/achievements`,
  );
}

export async function apiGetMyAchievementStatus(): Promise<AchievementStatus> {
  return apiClient.get<AchievementStatus>("/achievements/status");
}

export function checkResponseForAchievements(data: any) {
  const achievements = Array.isArray(data?.newAchievements)
    ? data.newAchievements
    : Array.isArray(data?.data?.newAchievements)
      ? data.data.newAchievements
      : [];

  achievements.forEach((achievement: any) => {
    triggerAchievementNotification(achievement);
  });
}

/**
 * Обрабатывает ответ API: разворачивает { data: ... }
 * и проверяет новые достижения.
 * Используется как прослойка для файлов, которые ещё не переведены на apiClient.
 */
export async function handleAchievementResponse<T>(
  response: Response,
): Promise<T> {
  const result = await handleResponse<unknown>(response);

  if (result && typeof result === "object" && "data" in (result as Record<string, unknown>)) {
    const obj = result as Record<string, unknown>;
    if (!("meta" in obj) && !("links" in obj)) {
      return obj.data as T;
    }
  }

  return result as T;
}
