import { prisma } from "../../lib/prisma.js";

export interface ForumStats {
  totalUsers: number;
  activeBattles: number;
  tierLists: number;
  totalBooks: number;
  totalThoughts: number;
}

export async function getForumStats(): Promise<ForumStats> {
  const [
    totalUsers,
    activeBattles,
    tierLists,
    totalBooks,
    bookCommentsCount,
    discussionsCount,
    placementThoughtsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.battle.count({
      where: {
        status: "active",
        endTime: { gt: new Date() },
      },
    }),
    prisma.tierList.count(),
    prisma.book.count(),
    prisma.bookComment.count({ where: { deletedAt: null } }),
    prisma.discussionMessage.count(),
    prisma.bookPlacement.count({
      where: {
        thoughts: {
          not: null,
          gt: "",
        },
      },
    }),
  ]);

  const totalThoughts = bookCommentsCount + discussionsCount + placementThoughtsCount;
  return { totalUsers, activeBattles, tierLists, totalBooks, totalThoughts };
}
