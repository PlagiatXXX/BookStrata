import { apiClient } from "./api-client";
import { createLogger } from "./logger";

const userLogger = createLogger("UserApi", { color: "green" });

export interface User {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  role?: string;
  isPro?: boolean;
  proExpiresAt?: string | null;
  createdAt: string;
}

export interface UserStats {
  tierListsCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
}

export async function apiGetMe(): Promise<User> {
  userLogger.info("Получение профиля текущего пользователя");
  return apiClient.get<User>("/users/me");
}

export async function apiUpdateAvatar(avatarUrl: string): Promise<User> {
  userLogger.info("Обновление аватара пользователя");
  return apiClient.put<User>("/users/me/avatar", { avatarUrl });
}

export async function apiDeleteAvatar(): Promise<User> {
  userLogger.info("Удаление аватара пользователя");
  return apiClient.delete<User>("/users/me/avatar");
}

export async function apiGetUserById(id: string): Promise<User> {
  userLogger.info("Получение пользователя по ID", { userId: id });
  return apiClient.get<User>(`/users/${id}`);
}

export async function apiGetUserStats(): Promise<UserStats> {
  userLogger.info("Получение статистики пользователя");
  return apiClient.get<UserStats>("/users/me/stats");
}

export async function apiUploadAvatar(base64Image: string): Promise<User> {
  userLogger.info("Загрузка аватара на Cloudinary");
  const result = await apiClient.post<{ success: boolean; avatarUrl: string; user: User }>(
    "/avatars/upload",
    { avatar: base64Image }
  );
  return result.user;
}
