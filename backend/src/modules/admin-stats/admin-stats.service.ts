import { prisma } from "../../lib/prisma.js";

export interface AdminDashboardStats {
  totalUsers: number
  proUsers: number
  activeNews: number
  tierLists: number
  violators: number
  feedbackCount: number
}

export class AdminStatsService {
  async getStats(): Promise<AdminDashboardStats> {
    const now = new Date()
    const [totalUsers, proUsers, activeNews, tierLists, violators, feedbackCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          isPro: true,
          OR: [
            { proExpiresAt: null },
            { proExpiresAt: { gte: now } },
          ],
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
    ])

    return { totalUsers, proUsers, activeNews, tierLists, violators, feedbackCount }
  }
}
