import { describe, it, expect } from 'vitest'
import { ChatRequestSchema, ChatMessageSchema } from './ai-librarian.schema.js'

describe('ChatMessageSchema', () => {
  it('validates a user message', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'Hello',
    })
    expect(result.success).toBe(true)
  })

  it('validates an assistant message', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'assistant',
      content: 'Hi there',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown role', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'admin',
      content: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing content', () => {
    const result = ChatMessageSchema.safeParse({ role: 'user' })
    expect(result.success).toBe(false)
  })
})

describe('ChatRequestSchema', () => {
  it('validates a chat request with messages', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Recommend me a book' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty messages array', () => {
    const result = ChatRequestSchema.safeParse({ messages: [] })
    expect(result.success).toBe(false)
  })

  it('rejects missing messages field', () => {
    const result = ChatRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('validates multiple messages', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Recommend something' },
      ],
    })
    expect(result.success).toBe(true)
  })
})
