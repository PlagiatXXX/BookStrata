import { prisma } from "../../lib/prisma.js"
import { createLogger } from "../../lib/logger.js"

const logger = createLogger("Discussions", { color: "cyan" })

const messageInclude = {
  user: {
    select: { id: true, username: true, avatarUrl: true, role: { select: { name: true } } },
  },
  parent: {
    select: {
      user: { select: { username: true } },
    },
  },
} as const

const discussionWithMessages = {
  messages: {
    include: messageInclude,
    orderBy: { createdAt: "asc" as const },
  },
}

const topicListInclude = {
  author: {
    select: { id: true, username: true, avatarUrl: true },
  },
} as const

export async function getDiscussionById(id: string) {
  return prisma.discussion.findUnique({
    where: { id },
    include: discussionWithMessages,
  })
}

export async function getDiscussionByBattle(battleId: string) {
  return prisma.discussion.findFirst({
    where: { battleId, type: "battle" },
    include: discussionWithMessages,
  })
}

export async function getOrCreateGeneralDiscussion() {
  let discussion = await prisma.discussion.findFirst({
    where: { type: "general" },
    include: discussionWithMessages,
  })
  if (!discussion) {
    discussion = await prisma.discussion.create({
      data: { title: "Общий чат", type: "general" },
      include: discussionWithMessages,
    })
  }
  return discussion
}

export async function createDiscussion(battleId: string, title?: string) {
  return prisma.discussion.create({
    data: { battleId, title: title ?? null, type: "battle" },
  })
}

export async function getTopics() {
  return prisma.discussion.findMany({
    where: { type: "topic" },
    include: {
      ...topicListInclude,
      _count: { select: { messages: true } },
    },
    orderBy: [
      { pinned: "desc" },
      { pinnedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
  })
}

export async function createTopic(title: string, userId: number) {
  return prisma.discussion.create({
    data: { title, type: "topic", authorId: userId },
    include: topicListInclude,
  })
}

export async function pinTopic(topicId: string) {
  const topic = await prisma.discussion.findUnique({ where: { id: topicId } })
  if (!topic) throw new Error("Topic not found")
  const now = new Date()
  return prisma.discussion.update({
    where: { id: topicId },
    data: {
      pinned: !topic.pinned,
      pinnedAt: topic.pinned ? null : now,
    },
    include: {
      ...topicListInclude,
      _count: { select: { messages: true } },
    },
  })
}

export async function deleteTopic(topicId: string) {
  const topic = await prisma.discussion.findUnique({ where: { id: topicId } })
  if (!topic) throw new Error("Topic not found")
  await prisma.discussion.delete({ where: { id: topicId } })
}

export async function getMessages(discussionId: string, page: number, limit: number) {
  const skip = (page - 1) * limit

  const [messages, total] = await Promise.all([
    prisma.discussionMessage.findMany({
      where: { discussionId },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.discussionMessage.count({ where: { discussionId } }),
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

  const now = new Date()

  const [message] = await prisma.$transaction([
    prisma.discussionMessage.create({
      data: { discussionId, userId, content, parentId: parentId ?? null },
      include: messageInclude,
    }),
    prisma.discussion.update({
      where: { id: discussionId },
      data: { lastMessageAt: now },
    }),
  ])

  return message
}

export async function updateMessage(messageId: string, userId: number, content: string) {
  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } })
  if (!message) throw new Error("Message not found")
  if (message.userId !== userId) throw new Error("You can only edit your own messages")

  return prisma.discussionMessage.update({
    where: { id: messageId },
    data: { content },
    include: messageInclude,
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
