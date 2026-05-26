import { z } from 'zod'

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
})
