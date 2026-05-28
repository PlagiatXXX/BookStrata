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
