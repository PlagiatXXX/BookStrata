import { apiClient } from "./api-client";
import { createLogger } from "./logger";

const avatarLogger = createLogger("AvatarApi", { color: "yellow" });

export interface AvatarLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  isPro?: boolean;
}

export interface GenerateAvatarResult {
  success: boolean;
  imageUrl: string;
  remaining: number;
}

export async function apiGenerateAvatar(
  prompt: string,
): Promise<GenerateAvatarResult> {
  avatarLogger.info("Generating avatar from user prompt");
  return apiClient.post<GenerateAvatarResult>("/avatars/generate", { prompt });
}

export async function apiGetAvatarLimit(): Promise<AvatarLimitInfo> {
  avatarLogger.info("Fetching avatar generation limit");
  return apiClient.get<AvatarLimitInfo>("/avatars/limit");
}
