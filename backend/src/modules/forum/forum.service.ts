import { prisma } from "../../lib/prisma.js";

export interface ForumStats {
  totalUsers: number;
  activeBattles: number;
}

export async function getForumStats(): Promise<ForumStats> {
  const [totalUsers, activeBattles] = await Promise.all([
    prisma.user.count(),
    prisma.battle.count({
      where: {
        status: "active",
        endTime: { gt: new Date() },
      },
    }),
  ]);

  return { totalUsers, activeBattles };
}
