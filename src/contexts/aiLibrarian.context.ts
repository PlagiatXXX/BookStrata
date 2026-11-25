import { createContext } from 'react'
import type { ChatMessage } from '@/lib/aiLibrarianApi'
import type { AiLibrarianContext as AiLibrarianPageContext } from '@/lib/aiLibrarianApi'

export type AiStatus = 'checking' | 'online' | 'offline'

export interface AiLibrarianContextValue {
  messages: ChatMessage[]
  activeSessionKey: string
  isStreaming: boolean
  streamingContent: string
  error: string | null
  status: AiStatus
  sendMessage: (content: string, context?: AiLibrarianPageContext) => Promise<void>
  retryLastMessage: (context?: AiLibrarianPageContext) => Promise<void>
  editLastMessage: () => string | null
  clearMessages: () => void
  refreshStatus: () => void
  switchSession: (sessionKey: string) => void
}

export const AiLibrarianReactContext = createContext<AiLibrarianContextValue | undefined>(undefined)

/**
 * Определяет ключ сессии на основе контекста страницы.
 * Разные страницы → разные сессии (отдельные диалоги).
 */
export function getSessionKey(context?: AiLibrarianPageContext): string {
  if (!context) return '__global'
  if (context.pageType === 'collection' && context.slug) return `collection:${context.slug}`
  if (context.pageType === 'reading-dna') return `reading-dna:${context.ticketNumber || 'active'}`
  if (context.pageType === 'tier-list') return `tier-list:${context.tierListId || 'draft'}`
  return context.pageType
}
