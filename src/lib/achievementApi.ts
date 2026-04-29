/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthHeader, handleResponse } from "./authApi";
import { API_BASE_URL } from "./config";
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
}

export interface AchievementStatus {
  xp: number;
  title: string;
}

/**
 * Получить достижения текущего пользователя
 */
export async function apiGetMyAchievements(): Promise<Achievement[]> {
  achievementLogger.info("Получение достижений пользователя");
  const response = await fetch(`${API_BASE_URL}/achievements/me`, {
    headers: getAuthHeader(),
  });
  return handleResponse<Achievement[]>(response);
}

/**
 * Получить XP статус пользователя
 */
export async function apiGetMyAchievementStatus(): Promise<AchievementStatus> {
  const response = await fetch(`${API_BASE_URL}/achievements/status`, {
    headers: getAuthHeader(),
  });
  return handleResponse<AchievementStatus>(response);
}

/**
 * Проверить ответ на наличие новых достижений
 */
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

export async function handleAchievementResponse<T>(
  response: Response,
): Promise<T> {
  const result = await handleResponse<T>(response);
  checkResponseForAchievements(result);
  return result;
}
