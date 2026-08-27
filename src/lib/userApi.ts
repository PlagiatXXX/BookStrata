import { apiClient } from "./api-client";
import { createLogger } from "./logger";
import type { PaginatedTierListsResponse } from "./tierListApi";
import type { UserBadge, BadgeColor } from "@/types/auth";

const userLogger = createLogger("UserApi", { color: "green" });

export interface User {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: SocialLink[] | null;
  role?: string;
  isDonor?: boolean;
  createdAt: string;
}

export interface PublicUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: SocialLink[] | null;
  isDonor: boolean;
  xp: number;
  title: string | null;
  icon: string | null;
  role: string | null;
  createdAt: string;
  stats: PublicUserStats;
  badges: UserBadge[];
}

export interface SocialLink {
  platform: string;
  url: string;
}

export type UpdateProfileInput = {
  username: string;
  bio?: string | null;
  socialLinks?: SocialLink[] | null;
};

export interface UserStats {
  tierListsCount: number;
  publishedCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
  totalBooks: number;
  lastActivity: string | null;
  totalActiveMinutes: number;
}

export interface PublicUserStats {
  tierListsCount: number;
  publishedCount: number;
  likesCount: number;
  totalBooks: number;
  lastActivity: string | null;
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

export async function apiUpdateProfile(
  input: UpdateProfileInput,
): Promise<User> {
  userLogger.info("Обновление профиля пользователя");
  return apiClient.put<User>("/users/me", input);
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

export interface ActivityTimelinePoint {
  month: string; // "2026-03"
  books: number;
  likes: number;
}

export async function apiGetActivityTimeline(
  months = 6,
): Promise<ActivityTimelinePoint[]> {
  userLogger.info("Получение таймлайна активности");
  return apiClient.get<ActivityTimelinePoint[]>(
    "/users/me/activity-timeline",
    { months },
  );
}

export async function apiGetUserTierLists(
  userId: string,
  page = 1,
  pageSize = 10,
) {
  userLogger.info("Получение публичных тир-листов пользователя", {
    userId,
    page,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return apiClient.get<any>(`/users/${userId}/tier-lists`, { page, pageSize });
}

export async function apiGetMyTierLists(
  page = 1,
  pageSize = 10,
): Promise<PaginatedTierListsResponse> {
  userLogger.info("Получение своих тир-листов", { page });
  return apiClient.get<PaginatedTierListsResponse>("/users/me/tier-lists", {
    page,
    pageSize,
  });
}

export interface MyBook {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  genre: string | null;
  tags: string[];
  tierListId: string;
  tierListTitle: string;
  createdAt: string;
}

export async function apiGetMyBooks(): Promise<MyBook[]> {
  userLogger.info("Получение своих книг");
  return apiClient.get<MyBook[]>("/users/me/books");
}

export async function apiGetTasteMatch(
  userId: string,
): Promise<TasteMatchResult> {
  userLogger.info("Получение совпадения вкусов", { userId });
  return apiClient.get<TasteMatchResult>(`/users/${userId}/taste-match`);
}

export async function apiUploadAvatar(base64Image: string): Promise<User> {
  userLogger.info("Загрузка аватара");
  const result = await apiClient.post<{
    success: boolean;
    avatarUrl: string;
    user: User;
  }>("/avatars/upload", { avatar: base64Image });
  return result.user;
}

export async function apiSetDonorStatus(
  userId: number,
  isDonor: boolean,
): Promise<{ id: number; username: string; isDonor: boolean }> {
  return apiClient.patch(`/users/admin/${userId}/donor`, { isDonor });
}

// Тип результата поиска пользователей
export interface UserSearchResult {
  id: number;
  username: string;
  avatarUrl: string | null;
  isDonor: boolean;
  xp: number;
  title: string | null;
  icon: string | null;
  role: string | null;
}

// GET /api/users/search?q= — поиск пользователей по нику
export async function apiSearchUsers(q: string): Promise<UserSearchResult[]> {
  userLogger.info("Поиск пользователей", { query: q });
  return apiClient.get<UserSearchResult[]>("/users/search", { q });
}

// ===== Кастомные бейджи =====

// GET /api/users/:id/badges — получить бейджи пользователя
export async function apiGetUserBadges(userId: string): Promise<UserBadge[]> {
  userLogger.info("Получение бейджей пользователя", { userId });
  return apiClient.get<UserBadge[]>(`/users/${userId}/badges`);
}

// POST /api/users/:id/badges — добавить бейдж (admin only)
export async function apiAddUserBadge(
  userId: string,
  text: string,
  color: BadgeColor,
): Promise<UserBadge> {
  userLogger.info("Добавление бейджа пользователю", { userId, text, color });
  return apiClient.post<UserBadge>(`/users/${userId}/badges`, { text, color });
}

// PUT /api/users/badges/:badgeId — обновить бейдж (admin only)
export async function apiUpdateUserBadge(
  badgeId: number,
  text: string,
  color: BadgeColor,
): Promise<UserBadge> {
  userLogger.info("Обновление бейджа", { badgeId, text, color });
  return apiClient.put<UserBadge>(`/users/badges/${badgeId}`, { text, color });
}

// DELETE /api/users/badges/:badgeId — удалить бейдж (admin only)
export async function apiDeleteUserBadge(badgeId: number): Promise<void> {
  userLogger.info("Удаление бейджа", { badgeId });
  await apiClient.delete(`/users/badges/${badgeId}`);
}
