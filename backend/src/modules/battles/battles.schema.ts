import { z } from 'zod';

export const createBattleBodySchema = z.object({
  templateId: z.string().uuid().optional(),
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
    required: ['title', 'type', 'endTime', 'participantTierListIds'],
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

// Заявки на участие
export const applyToBattleBodySchema = z.object({
  tierListId: z.string(),
  message: z.string().max(500).optional(),
});

export const applyToBattleSchema = {
  description: 'Apply to participate in a battle',
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
      message: { type: 'string', maxLength: 500 },
    },
  },
};

export const reviewApplicationParamsSchema = z.object({
  id: z.string(),
  applicationId: z.coerce.number(),
});

export const reviewApplicationBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const reviewApplicationSchema = {
  description: 'Approve or reject a battle application (Admin only)',
  tags: ['Battles'],
  params: {
    type: 'object',
    required: ['id', 'applicationId'],
    properties: {
      id: { type: 'string' },
      applicationId: { type: 'integer' },
    },
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['approved', 'rejected'] },
    },
  },
};

export type CreateBattleBody = z.infer<typeof createBattleBodySchema>;
export type VoteInBattleBody = z.infer<typeof voteInBattleBodySchema>;
export type ApplyToBattleBody = z.infer<typeof applyToBattleBodySchema>;
export type ReviewApplicationBody = z.infer<typeof reviewApplicationBodySchema>;
