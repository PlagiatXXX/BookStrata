import type { ApiTier } from './api';

export interface BattleParticipant {
  id: number;
  battleId: string;
  tierListId: string;
  votesCount: number;
  tierList: BattleTierList;
}

export interface BattlePlacementBook {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  thoughts: string | null;
}

export interface BattlePlacement {
  rank: number;
  book: BattlePlacementBook;
  tierId: number | null;
  tierListId: string;
}

export interface BattleTierList {
  id: string;
  slug?: string | null;
  title: string;
  userId?: number;
  user?: {
    id?: number;
    username: string;
    avatarUrl?: string | null;
  };
  tiers?: ApiTier[];
  placements?: BattlePlacement[];
}

export interface Battle {
  id: string;
  templateId: string | null;
  title: string;
  description: string | null;
  type: 'weekly' | 'monthly';
  status: 'active' | 'completed';
  startTime: string;
  endTime: string;
  winnerId: string | null;
  participants: BattleParticipant[];
  createdAt: string;
  updatedAt: string;
  template?: {
    id?: string;
    title: string;
  } | null;
}

export interface CreateBattleRequest {
  templateId?: string;
  title: string;
  description?: string;
  type: 'weekly' | 'monthly';
  endTime: string;
  participantTierListIds: string[];
}
