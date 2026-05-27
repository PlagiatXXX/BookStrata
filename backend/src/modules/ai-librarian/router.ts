import { createLogger } from '../../lib/logger.js'
import type { AiProvider } from './providers/types.js'
import { customProvider } from './providers/custom.js'
import { geminiProvider } from './providers/gemini.js'
import { groqProvider } from './providers/groq.js'
import type { AiChunk } from './ai-librarian.service.js'
import { getCachedResponse, setCachedResponse } from './cache.js'

const logger = createLogger('AiRouter', { color: 'cyan' })

const providers: AiProvider[] = [
  customProvider,
  geminiProvider,
  groqProvider,
]

const API_KEY_MAP: Record<string, string> = {
  custom: 'CUSTOM_AI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
}

export class AiRouterError extends Error {
  constructor(
    message: string,
    public readonly providerErrors: Array<{ provider: string; error: string }>,
  ) {
    super(message)
    this.name = 'AiRouterError'
  }
}

export async function* routeAiResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  signal?: AbortSignal,
  userId?: string,
): AsyncGenerator<AiChunk> {
  const cached = getCachedResponse(systemPrompt, messages)
  if (cached !== null) {
    yield { content: cached, done: false }
    yield { content: '', done: true }
    return
  }

  const errors: Array<{ provider: string; error: string }> = []
  let fullResponse = ''

  for (const provider of providers) {
    const envKey = API_KEY_MAP[provider.name]
    const apiKey = envKey ? process.env[envKey] : ''
    if (!provider.model || !apiKey) {
      logger.warn('Skipping provider — no API key configured', { provider: provider.name })
      continue
    }

    logger.info('Trying AI provider', { provider: provider.name, model: provider.model })

    try {
      for await (const chunk of provider.generate(messages, systemPrompt, signal, userId)) {
        if (!chunk.done && chunk.content) {
          fullResponse += chunk.content
        }
        yield chunk
      }

      if (fullResponse.trim()) {
        setCachedResponse(systemPrompt, messages, fullResponse)
      }

      logger.info('AI provider succeeded', {
        provider: provider.name,
        chars: fullResponse.length,
      })
      return
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('AI provider failed', { provider: provider.name, error: errorMessage })
      errors.push({ provider: provider.name, error: errorMessage })
      fullResponse = ''
    }
  }

  logger.error('All AI providers failed', { errors })

  throw new AiRouterError(
    'Букстраж сейчас на перерыве. Постучись через минуту.',
    errors,
  )
}

export async function checkAllProvidersStatus(): Promise<{
  online: boolean
  providers: Array<{ name: string; online: boolean; model: string | null }>
  activeModel: string | null
}> {
  const results = await Promise.all(
    providers.map(async (p) => {
      const status = await p.checkStatus()
      return { name: p.name, ...status }
    }),
  )

  const onlineProvider = results.find((r) => r.online)
  return {
    online: results.some((r) => r.online),
    providers: results,
    activeModel: onlineProvider ? onlineProvider.model : null,
  }
}
