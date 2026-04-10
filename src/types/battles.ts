import type { ApiTierListResponse } from './api';

export interface BattleParticipant {
  id: number;
  battleId: number;
  tierListId: number;
  votesCount: number;
  tierList: ApiTierListResponse;
}

export interface Battle {
  id: number;
  templateId: string;
  title: string;
  description: string | null;
  type: 'weekly' | 'monthly';
  status: 'active' | 'completed';
  startTime: string;
  endTime: string;
  winnerId: number | null;
  participants: BattleParticipant[];
  createdAt: string;
  updatedAt: string;
  template?: {
    title: string;
  };
}

export interface CreateBattleRequest {
  templateId: string;
  title: string;
  description?: string;
  type: 'weekly' | 'monthly';
  endTime: string;
  participantTierListIds: number[];
}
