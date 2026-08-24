import { prisma } from "../../lib/prisma.js";

export async function getTrendingBooks(limit = 8) {
  return prisma.book.findMany({
    where: { status: "published", isTrending: true, coverImageUrl: { not: "" } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, slug: true, title: true, author: true, coverImageUrl: true },
  });
}
