import { apiClient } from "@/lib/api-client"

export interface ModerationStatus {
  id: number
  username: string | null
  role: string
  chatBanned: boolean
  chatBannedAt: string | null
  chatBannedUntil: string | null
  suspended: boolean
  suspendedAt: string | null
  suspendedUntil: string | null
  suspensionReason: string | null
  warningsCount: number
}

export interface Warning {
  id: number
  message: string
  createdAt: string
  moderator: { id: number; username: string }
}

export async function apiGetModerationStatus(userId: number): Promise<ModerationStatus> {
  return apiClient.get<ModerationStatus>(`/moderation/users/${userId}/moderation`)
}

export async function apiBanChat(userId: number, duration?: number) {
  return apiClient.post(`/moderation/users/${userId}/ban-chat`, { duration })
}

export async function apiUnbanChat(userId: number) {
  return apiClient.post(`/moderation/users/${userId}/unban-chat`)
}

export async function apiSuspend(userId: number, duration: number, reason?: string) {
  return apiClient.post(`/moderation/users/${userId}/suspend`, { duration, reason })
}

export async function apiUnsuspend(userId: number) {
  return apiClient.post(`/moderation/users/${userId}/unsuspend`)
}

export async function apiWarn(userId: number, message: string): Promise<Warning> {
  return apiClient.post<Warning>(`/moderation/users/${userId}/warn`, { message })
}

export async function apiGetWarnings(userId: number): Promise<Warning[]> {
  return apiClient.get<Warning[]>(`/moderation/users/${userId}/warnings`)
}

export async function apiChangeRole(userId: number, role: string) {
  return apiClient.put(`/moderation/users/${userId}/role`, { role })
}

// ====== Флаги контента (NSFW) ======

export interface ContentFlag {
  id: number
  userId: number
  username: string | null
  avatarUrl: string | null
  imageUrl: string
  flagType: string
  targetId: string | null
  nsfwScore: number | null
  status: string
  createdAt: string
  resolvedAt: string | null
  resolvedByUsername: string | null
}

export interface FlagsListResult {
  flags: ContentFlag[]
  total: number
}

export async function apiCreateFlag(data: {
  imageUrl: string
  flagType: string
  targetId?: string | null
  nsfwScore?: number | null
}) {
  return apiClient.post("/moderation/flags", data)
}

export async function apiGetFlags(params?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<FlagsListResult> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize))
  const qs = searchParams.toString()
  return apiClient.get<FlagsListResult>(`/moderation/flags${qs ? `?${qs}` : ""}`)
}

export async function apiResolveFlag(flagId: number, action: "resolved" | "dismissed") {
  return apiClient.patch(`/moderation/flags/${flagId}/resolve`, { action })
}
