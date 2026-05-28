import { z } from "zod"

export const createMessageBodySchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
})

export const updateMessageBodySchema = z.object({
  content: z.string().min(1).max(5000),
})

export const getMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export type CreateMessageBody = z.infer<typeof createMessageBodySchema>
export type UpdateMessageBody = z.infer<typeof updateMessageBodySchema>
