import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { createPresenceService, type PresenceRedisClient } from "../presence/presence.service.js";
import { getMoscowDayStart } from "../analytics/analytics.service.js";

export interface AdminDashboardStats {
  totalUsers: number;
  proUsers: number;
  activeNews: number;
  tierLists: number;
  violators: number;
  feedbackCount: number;
  onlineCount: number;
  onlineUsersCount: number;
  onlineGuestsCount: number;
  newUsersToday: number;
}

export class AdminStatsService {
  async getStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const todayStart = getMoscowDayStart(now);
    const presence = createPresenceService(prisma, redis as unknown as PresenceRedisClient);

    const [
      totalUsers,
      proUsers,
      activeNews,
      tierLists,
      violators,
      feedbackCount,
      newUsersToday,
      onlineCounts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          isPro: true,
          OR: [{ proExpiresAt: null }, { proExpiresAt: { gte: now } }],
        },
      }),
      prisma.newsArticle.count({ where: { isPublished: true } }),
      prisma.tierList.count(),
      prisma.user.count({
        where: {
          OR: [
            { chatBannedAt: { not: null } },
            { suspendedAt: { not: null } },
            { warnings: { some: {} } },
          ],
        },
      }),
      prisma.feedback.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      presence.getOnlineCounts(),
    ]);

    return {
      totalUsers,
      proUsers,
      activeNews,
      tierLists,
      violators,
      feedbackCount,
      onlineCount: onlineCounts.totalOnline,
      onlineUsersCount: onlineCounts.authCount,
      onlineGuestsCount: onlineCounts.guestCount,
      newUsersToday,
    };
  }
}
