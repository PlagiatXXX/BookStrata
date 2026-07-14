import { z } from 'zod'

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

export const PageContextSchema = z.object({
  pageType: z.enum(['rankings', 'collection', 'book-description']),
  slug: z.string().optional(),
})

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  context: PageContextSchema.optional(),
})
