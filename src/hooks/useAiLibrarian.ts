import { useContext } from 'react'
import { AiLibrarianReactContext, type AiLibrarianContextValue, type AiStatus } from '@/contexts/aiLibrarian.context'

export function useAiLibrarian(): AiLibrarianContextValue {
  const ctx = useContext(AiLibrarianReactContext)
  if (!ctx) {
    throw new Error('useAiLibrarian must be used within an AiLibrarianProvider')
  }
  return ctx
}

export type { AiStatus }
