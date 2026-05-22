import { prisma } from "../../lib/prisma.js";

export interface AdminDashboardStats {
  totalUsers: number
  proUsers: number
  activeNews: number
  tierLists: number
}

export class AdminStatsService {
  async getStats(): Promise<AdminDashboardStats> {
    const [totalUsers, proUsers, activeNews, tierLists] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          isPro: true,
          OR: [
            { proExpiresAt: null },
            { proExpiresAt: { gte: new Date() } },
          ],
        },
      }),
      prisma.newsArticle.count({ where: { isPublished: true } }),
      prisma.tierList.count(),
    ])

    return { totalUsers, proUsers, activeNews, tierLists }
  }
}
