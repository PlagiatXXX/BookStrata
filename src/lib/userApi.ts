import { apiClient } from "./api-client";
import { createLogger } from "./logger";

const userLogger = createLogger("UserApi", { color: "green" });

export interface User {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  role?: string;
  isDonor?: boolean;
  createdAt: string;
}

export interface UserStats {
  tierListsCount: number;
  publishedCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
  totalBooks: number;
  lastActivity: string | null;
}

export interface PublicUserStats {
  tierListsCount: number;
  publishedCount: number;
  likesCount: number;
  totalBooks: number;
  lastActivity: string | null;
}

export interface PublicUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  isDonor: boolean;
  xp: number;
  title: string | null;
  role: string | null;
  createdAt: string;
  stats: PublicUserStats;
}

export interface TasteMatchResult {
  matchPercent: number;
  commonBooks: number;
  totalBooks: number;
}

export async function apiGetMe(): Promise<User> {
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

export async function apiGetPublicUser(id: string): Promise<PublicUser> {
  userLogger.info("Получение публичного профиля", { userId: id });
  return apiClient.get<PublicUser>(`/users/${id}`);
}

export async function apiGetUserStats(): Promise<UserStats> {
  userLogger.info("Получение статистики пользователя");
  return apiClient.get<UserStats>("/users/me/stats");
}

export async function apiGetUserTierLists(
  userId: string,
  page = 1,
  pageSize = 10,
) {
  userLogger.info("Получение публичных тир-листов пользователя", { userId, page });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return apiClient.get<any>(`/users/${userId}/tier-lists`, { page, pageSize });
}

export async function apiGetTasteMatch(userId: string): Promise<TasteMatchResult> {
  userLogger.info("Получение совпадения вкусов", { userId });
  return apiClient.get<TasteMatchResult>(`/users/${userId}/taste-match`);
}

export async function apiUploadAvatar(base64Image: string): Promise<User> {
  userLogger.info("Загрузка аватара на Cloudinary");
  const result = await apiClient.post<{ success: boolean; avatarUrl: string; user: User }>(
    "/avatars/upload",
    { avatar: base64Image }
  );
  return result.user;
}

export async function apiSetDonorStatus(userId: number, isDonor: boolean): Promise<{ id: number; username: string; isDonor: boolean }> {
  return apiClient.patch(`/users/admin/${userId}/donor`, { isDonor });
}
