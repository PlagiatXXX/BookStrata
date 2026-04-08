import { getAuthHeader, handleResponse } from "./authApi";
import { API_BASE_URL } from "./config";
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

  const response = await fetch(`${API_BASE_URL}/avatars/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ prompt }),
  });

  return handleResponse<GenerateAvatarResult>(response);
}

export async function apiGetAvatarLimit(): Promise<AvatarLimitInfo> {
  avatarLogger.info("Fetching avatar generation limit");

  const response = await fetch(`${API_BASE_URL}/avatars/limit`, {
    method: "GET",
    headers: getAuthHeader(),
  });

  return handleResponse<AvatarLimitInfo>(response);
}
