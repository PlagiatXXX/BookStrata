import { prisma } from "../../lib/prisma.js";

export interface ForumStats {
  totalUsers: number;
  activeBattles: number;
  tierLists: number;
  totalBooks: number;
}

export async function getForumStats(): Promise<ForumStats> {
  const [totalUsers, activeBattles, tierLists, totalBooks] = await Promise.all([
    prisma.user.count(),
    prisma.battle.count({
      where: {
        status: "active",
        endTime: { gt: new Date() },
      },
    }),
    prisma.tierList.count(),
    prisma.book.count(),
  ]);

  return { totalUsers, activeBattles, tierLists, totalBooks };
}
