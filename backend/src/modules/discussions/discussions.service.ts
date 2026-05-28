import { prisma } from "../../lib/prisma.js"
import { createLogger } from "../../lib/logger.js"

const logger = createLogger("Discussions", { color: "cyan" })

export async function getDiscussionByBattle(battleId: string) {
  return prisma.discussion.findUnique({
    where: { battleId },
    include: {
      messages: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
          },
          replies: {
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
}

export async function getOrCreateGeneralDiscussion() {
  let discussion = await prisma.discussion.findFirst({
    where: { battleId: null },
    include: {
      messages: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
          },
          replies: {
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!discussion) {
    discussion = await prisma.discussion.create({
      data: { title: "Общий чат" },
      include: {
        messages: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
            },
            replies: {
              include: {
                user: {
                  select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
  }
  return discussion
}

export async function createDiscussion(battleId: string, title?: string) {
  return prisma.discussion.create({
    data: { battleId, title: title ?? null },
  })
}

export async function getMessages(discussionId: string, page: number, limit: number) {
  const skip = (page - 1) * limit

  const [messages, total] = await Promise.all([
    prisma.discussionMessage.findMany({
      where: { discussionId, parentId: null },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
        },
        replies: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.discussionMessage.count({ where: { discussionId, parentId: null } }),
  ])

  return { messages, total }
}

export async function createMessage(
  discussionId: string,
  userId: number,
  content: string,
  parentId?: string,
) {
  if (parentId) {
    const parent = await prisma.discussionMessage.findUnique({
      where: { id: parentId },
      select: { discussionId: true },
    })
    if (!parent || parent.discussionId !== discussionId) {
      throw new Error("Parent message not found")
    }
  }

  return prisma.discussionMessage.create({
    data: { discussionId, userId, content, parentId: parentId ?? null },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
      },
    },
  })
}

export async function updateMessage(messageId: string, userId: number, content: string) {
  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } })
  if (!message) throw new Error("Message not found")
  if (message.userId !== userId) throw new Error("You can only edit your own messages")

  return prisma.discussionMessage.update({
    where: { id: messageId },
    data: { content },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
      },
    },
  })
}

export async function deleteMessage(messageId: string, userId: number, userRole: string | undefined) {
  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } })
  if (!message) throw new Error("Message not found")

  const isModOrAdmin = userRole === "admin" || userRole === "moderator"
  if (!isModOrAdmin) {
    throw new Error("Only admins and moderators can delete messages")
  }

  await prisma.discussionMessage.delete({ where: { id: messageId } })
}
