import { apiClient } from './api-client';
import type { Battle, CreateBattleRequest } from '@/types/battles';

export async function getActiveBattles(): Promise<Battle[]> {
  return apiClient.get<Battle[]>('/battles');
}

export async function getBattleById(id: number): Promise<Battle> {
  return apiClient.get<Battle>(`/battles/${id}`);
}

export async function createBattle(data: CreateBattleRequest): Promise<Battle> {
  return apiClient.post<Battle>('/battles', data);
}

export async function voteInBattle(battleId: number, tierListId: number): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/battles/${battleId}/vote`, { tierListId });
}

export async function closeBattle(battleId: number): Promise<Battle> {
  return apiClient.post<Battle>(`/battles/${battleId}/close`);
}
