import { apiClient } from "./api-client";
import type { AdminDashboardStats } from "@/../shared/types";

export type { AdminDashboardStats };

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiClient.get<AdminDashboardStats>("/admin/stats");
}
