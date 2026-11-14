import { z } from "zod";

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Сообщение не может быть пустым").max(2000, "Максимальная длина — 2000 символов"),
  replyToId: z.number().int().positive().optional(),
});

export const adminReplySchema = z.object({
  text: z.string().trim().min(1, "Ответ не может быть пустым").max(2000, "Максимальная длина — 2000 символов"),
  replyToId: z.number().int().positive().optional(),
});

export const updateThreadStatusSchema = z.object({
  status: z.enum(["open", "answered", "resolved"]),
});

export const threadIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const messageIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const adminThreadsQuerySchema = z.object({
  status: z.enum(["all", "open", "answered", "resolved"]).default("all"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
