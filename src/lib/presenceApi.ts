import { apiClient } from "./api-client";
import { API_BASE_URL } from "./config";
import { getAuthHeader } from "./authApi";
import type { OnlinePresenceSnapshotDto } from "@/../shared/types";

export interface PresencePingPayload {
  anonId: string;
  page: string;
  status: "active" | "idle";
}

export function apiGetOnlinePresence(): Promise<OnlinePresenceSnapshotDto> {
  return apiClient.get<OnlinePresenceSnapshotDto>("/admin/presence/online");
}

export async function sendPresencePing(payload: PresencePingPayload): Promise<void> {
  if (typeof window !== "undefined" && window.__PRERENDER__) return;
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  if (typeof fetch !== "function") return;

  try {
    await fetch(`${API_BASE_URL}/presence/ping`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Фоновый пинг не должен ломать UX
  }
}

export function sendPresenceLeave(anonId: string): void {
  if (typeof window !== "undefined" && window.__PRERENDER__) return;
  if (typeof navigator !== "undefined" && navigator.webdriver) return;

  const url = `${API_BASE_URL}/presence/leave`;
  const body = JSON.stringify({ anonId });
  const authHeader = getAuthHeader();

  // Для авторизованного пользователя используем fetch keepalive (сохраняет Authorization),
  // для гостя — sendBeacon (гарантированная доставка при закрытии вкладки)
  if (authHeader.Authorization && typeof fetch === "function") {
    fetch(url, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body,
    }).catch(() => {});
    return;
  }

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }

  if (typeof fetch === "function") {
    fetch(url, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {});
  }
}
