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
  pageType: z.enum(['rankings', 'collection', 'book-description', 'celebrity', 'reading-dna', 'tier-list']),
  slug: z.string().optional(),
  ticketNumber: z.string().optional(),
  tierListId: z.string().optional(),
})

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
  context: PageContextSchema.optional(),
})

export const TierBookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional(),
})

export const TierItemSchema = z.object({
  label: z.string().min(1).max(50),
  color: z.string().max(30).optional(),
  books: z.array(TierBookSchema),
})

export const TierListRoastRequestSchema = z.object({
  tierListTitle: z.string().min(1).max(200),
  tierListDescription: z.string().max(2000).optional(),
  tiers: z.array(TierItemSchema),
}).superRefine((val, ctx) => {
  const totalBooks = val.tiers.reduce((acc, tier) => acc + tier.books.length, 0)
  if (totalBooks < 4) {
    ctx.addIssue({
      code: 'custom',
      message: 'Для прожарки нужно распределить минимум 4 книги',
      path: ['tiers'],
    })
  }
})

export type TierListRoastRequest = z.infer<typeof TierListRoastRequestSchema>

export const TierListRoastResponseSchema = z.object({
  archetype: z.string().min(1).max(100),
  roast: z.string().min(1).max(1000),
  hotTake: z.string().min(1).max(500),
  cynicismScore: z.number().int().min(0).max(100),
  cached: z.boolean().optional(),
})

export type TierListRoastResponse = z.infer<typeof TierListRoastResponseSchema>
