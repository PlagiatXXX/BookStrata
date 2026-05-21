import { apiClient } from './api-client';

export interface LikesResponse {
  likesCount: number;
  isLiked: boolean;
}

export async function apiGetTierListLikes(tierListId: string): Promise<LikesResponse> {
  return apiClient.get<LikesResponse>(`/tier-lists/${tierListId}/likes`);
}

export async function apiLikeTierList(tierListId: string): Promise<LikesResponse> {
  return apiClient.post<LikesResponse>(`/tier-lists/${tierListId}/like`, {});
}

export async function apiUnlikeTierList(tierListId: string): Promise<LikesResponse> {
  return apiClient.delete<LikesResponse>(`/tier-lists/${tierListId}/like`);
}

export async function apiGetLikedTierListIds(): Promise<{ likedIds: string[] }> {
  return apiClient.get<{ likedIds: string[] }>('/tier-lists/liked');
}

export async function apiGetTemplateLikes(templateId: string): Promise<LikesResponse> {
  return apiClient.get<LikesResponse>(`/templates/${templateId}/likes`);
}

export async function apiLikeTemplate(templateId: string): Promise<LikesResponse> {
  return apiClient.post<LikesResponse>(`/templates/${templateId}/like`, {});
}

export async function apiUnlikeTemplate(templateId: string): Promise<LikesResponse> {
  return apiClient.delete<LikesResponse>(`/templates/${templateId}/like`);
}
