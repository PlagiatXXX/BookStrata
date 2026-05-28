import { z } from "zod";

export const banChatSchema = {
  body: z.object({
    duration: z.number().positive().optional(),
    reason: z.string().max(500).optional(),
  }),
};

export const suspendSchema = {
  body: z.object({
    duration: z.number().positive(),
    reason: z.string().max(500).optional(),
  }),
};

export const warnSchema = {
  body: z.object({
    message: z.string().min(1).max(1000),
  }),
};

export const changeRoleSchema = {
  body: z.object({
    role: z.enum(["admin", "moderator", "user"]),
  }),
};

export const createFlagSchema = {
  body: z.object({
    imageUrl: z.string().min(1),
    flagType: z.enum(["avatar", "tier-cover", "book-cover"]),
    targetId: z.string().nullable().optional(),
    nsfwScore: z.number().min(0).max(1).nullable().optional(),
  }),
};

export const resolveFlagSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    action: z.enum(["resolved", "dismissed"]),
  }),
};
