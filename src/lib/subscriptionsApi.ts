import { apiClient } from "./api-client";

export interface SubscriptionStats {
  totalProUsers: number;
  activeSubscriptions: number;
  lifetimeSubscriptions: number;
  expiringSoon: number;
}

export interface SetProStatusResponse {
  userId: number;
  isPro: boolean;
  proExpiresAt: string | null;
}

export interface ActivateProResponse {
  userId: number;
  isPro: boolean;
  proExpiresAt: string;
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  return apiClient.get<SubscriptionStats>("/subscriptions/stats");
}

export async function setProStatus(data: {
  userId: number;
  isPro: boolean;
  expiresAt?: string | null;
}): Promise<SetProStatusResponse> {
  return apiClient.post<SetProStatusResponse>("/subscriptions/set-status", data);
}

export async function activateProSubscription(data: {
  userId: number;
  durationDays: number;
}): Promise<ActivateProResponse> {
  return apiClient.post<ActivateProResponse>("/subscriptions/activate", data);
}
