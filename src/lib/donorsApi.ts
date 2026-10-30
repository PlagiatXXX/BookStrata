import { apiClient } from "./api-client";

export interface DonorItem {
  id: number;
  name: string;
}

export async function getDonors(): Promise<DonorItem[]> {
  return apiClient.get<DonorItem[]>("/donors");
}

export async function createDonor(name: string): Promise<DonorItem> {
  return apiClient.post<DonorItem>("/donors", { name });
}

export async function deleteDonor(id: number): Promise<void> {
  return apiClient.delete(`/donors/${id}`);
}
