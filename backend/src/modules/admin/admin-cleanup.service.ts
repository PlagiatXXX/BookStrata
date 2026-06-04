import type { PrismaClient } from "@prisma/client";

interface CleanupResult {
  deleted: number;
  orphanedBooks: number;
  usernames: (string | null)[];
  templatesDeleted: number;
}

export async function cleanupLoadTestUsers(prisma: PrismaClient): Promise<CleanupResult> {
  const users = await prisma.user.findMany({
    where: { username: { startsWith: "load_" } },
    select: { id: true, username: true, email: true },
  });

  if (users.length === 0) {
    return { deleted: 0, orphanedBooks: 0, usernames: [], templatesDeleted: 0 };
  }

  const userIds = users.map((u) => u.id);

  const deletedTemplates = await prisma.template.deleteMany({
    where: { authorId: { in: userIds } },
  });

  await prisma.feedback.deleteMany({
    where: { userId: { in: userIds } },
  });

  await prisma.discussion.deleteMany({
    where: { authorId: { in: userIds } },
  });

  await prisma.discussionMessage.deleteMany({
    where: { userId: { in: userIds } },
  });

  const deletedUsers = await prisma.$executeRawUnsafe(
    `DELETE FROM "User" WHERE id = ANY(ARRAY[${userIds.join(',')}]::int4[])`,
  );

  const orphanedBooks = await prisma.book.deleteMany({
    where: { placements: { none: {} } },
  });

  return {
    deleted: deletedUsers,
    orphanedBooks: orphanedBooks.count,
    usernames: users.map((u) => u.username),
    templatesDeleted: deletedTemplates.count,
  };
}
