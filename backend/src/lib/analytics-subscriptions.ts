import { eventBus } from './event-emitter.js'
import { createAnalyticsService } from '../modules/analytics/analytics.service.js'
import { prisma } from './prisma.js'

const analytics = createAnalyticsService(prisma)

export function registerAnalyticsSubscriptions() {
  eventBus.on('user:registered', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'user_register' })
  })

  eventBus.on('user:login', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'login' })
  })

  eventBus.on('tier-list:created', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'tierlist_create' })
  })

  eventBus.on('tier-list:book-added', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'book_add' })
  })

  eventBus.on('tier-list:forked', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'tierlist_fork' })
  })

  eventBus.on('tier-list:liked', async ({ userId, tierListUserId }) => {
    await analytics.trackEvent({ userId, event: 'tierlist_like', meta: { targetUserId: tierListUserId } })
  })

  eventBus.on('review:written', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'review_write' })
  })

  eventBus.on('battle:participated', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'battle_participate' })
  })

  eventBus.on('battle:won', async ({ userId }) => {
    await analytics.trackEvent({ userId, event: 'battle_win' })
  })
}
