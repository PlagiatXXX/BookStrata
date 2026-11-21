import { z } from 'zod'

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
}).superRefine((val, ctx) => {
  // Ответы Букстража (assistant) с подборками книг часто длиннее 2000 символов,
  // поэтому лимит по роли: user <= 2000, assistant <= 8000.
  const max = val.role === 'user' ? 2000 : 8000
  if (val.content.length > max) {
    ctx.addIssue({
      code: 'custom',
      message: `Content too long (max ${max} characters)`,
      path: ['content'],
    })
  }
})

export const PageContextSchema = z.object({
  pageType: z.enum(['rankings', 'collection', 'book-description', 'celebrity']),
  slug: z.string().optional(),
})

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
  context: PageContextSchema.optional(),
})