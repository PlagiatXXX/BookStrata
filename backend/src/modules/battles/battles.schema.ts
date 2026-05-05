import { z } from 'zod';

export const createBattleBodySchema = z.object({
  templateId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['weekly', 'monthly']),
  endTime: z.string().datetime(),
  participantTierListIds: z.array(z.string()).min(2),
});

export const voteInBattleBodySchema = z.object({
  tierListId: z.string(),
});

export const createBattleSchema = {
  description: 'Create a new battle (Admin only)',
  tags: ['Battles'],
  body: {
    type: 'object',
    required: ['templateId', 'title', 'type', 'endTime', 'participantTierListIds'],
    properties: {
      templateId: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string' },
      type: { type: 'string', enum: ['weekly', 'monthly'] },
      endTime: { type: 'string', format: 'date-time' },
      participantTierListIds: { type: 'array', items: { type: 'string' }, minItems: 2 },
    },
  },
};

export const voteInBattleSchema = {
  description: 'Vote for a tier list in a battle',
  tags: ['Battles'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['tierListId'],
    properties: {
      tierListId: { type: 'string' },
    },
  },
};

export const closeBattleSchema = {
  description: 'Close a battle and determine winner (Admin only)',
  tags: ['Battles'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};

export type CreateBattleBody = z.infer<typeof createBattleBodySchema>;
export type VoteInBattleBody = z.infer<typeof voteInBattleBodySchema>;
