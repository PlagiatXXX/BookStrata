import { createLogger } from "./logger.js";

const logger = createLogger("EventBus", { color: "green" });

export interface EventPayloads {
  "tier-list:created": { userId: number }
  "tier-list:book-added": { userId: number }
  "tier-list:forked": { userId: number }
  "tier-list:liked": { userId: number; tierListUserId: number }
  "review:written": { userId: number }
  "battle:participated": { userId: number }
  "battle:won": { userId: number }
}

type EventName = keyof EventPayloads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (payload: any) => any

class EventBus {
  private listeners = new Map<EventName, Set<Handler>>()

  on<K extends EventName>(event: K, handler: (payload: EventPayloads[K]) => unknown) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as Handler)
    logger.debug(`Подписчик зарегистрирован на событие "${event}"`)
  }

  off<K extends EventName>(event: K, handler: (payload: EventPayloads[K]) => unknown) {
    this.listeners.get(event)?.delete(handler as Handler)
  }

  async emit<K extends EventName>(event: K, payload: EventPayloads[K]): Promise<unknown[]> {
    const handlers = this.listeners.get(event)
    if (!handlers || handlers.size === 0) {
      return []
    }

    const results = await Promise.allSettled(
      [...handlers].map((h) => h(payload)),
    )

    const collected: unknown[] = []
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value !== undefined) {
          if (Array.isArray(result.value)) {
            collected.push(...result.value)
          } else {
            collected.push(result.value)
          }
        }
      } else {
        logger.error(result.reason as Error, {
          event,
          message: `Ошибка в обработчике события "${event}"`,
        })
      }
    }

    return collected
  }
}

export const eventBus = new EventBus()
