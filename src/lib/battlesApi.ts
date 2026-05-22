import { apiClient } from './api-client';
import type { Battle, CreateBattleRequest } from '@/types/battles';

export async function getActiveBattles(): Promise<Battle[]> {
  return apiClient.get<Battle[]>('/battles');
}

export async function getBattleById(id: string): Promise<Battle> {
  return apiClient.get<Battle>(`/battles/${id}`);
}

export async function createBattle(data: CreateBattleRequest): Promise<Battle> {
  return apiClient.post<Battle>('/battles', data);
}

export async function voteInBattle(battleId: string, tierListId: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/battles/${battleId}/vote`, { tierListId });
}

export async function closeBattle(battleId: string): Promise<Battle> {
  return apiClient.post<Battle>(`/battles/${battleId}/close`);
}

// Заявки на участие
export interface BattleApplication {
  id: number;
  battleId: string | null;
  userId: number;
  tierListId: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  };
  tierList: {
    id: string;
    title: string;
    isPublic: boolean;
  };
  battle?: {
    id: string;
    title: string;
  } | null;
}

export async function applyToBattle(
  battleId: string,
  tierListId: string,
  message?: string,
): Promise<BattleApplication> {
  return apiClient.post<BattleApplication>(`/battles/${battleId}/apply`, { tierListId, message });
}

export async function applyGeneral(
  tierListId: string,
  message?: string,
): Promise<BattleApplication> {
  return apiClient.post<BattleApplication>('/battles/apply', { tierListId, message });
}

export async function getApplications(battleId: string): Promise<BattleApplication[]> {
  return apiClient.get<BattleApplication[]>(`/battles/${battleId}/applications`);
}

export async function reviewApplication(
  battleId: string,
  applicationId: number,
  status: 'approved' | 'rejected',
): Promise<{ success: boolean }> {
  return apiClient.patch<{ success: boolean }>(
    `/battles/${battleId}/applications/${applicationId}`,
    { status },
  );
}
