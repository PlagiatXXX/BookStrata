import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export interface SendUserMessageInput {
  userId?: number | null;
  guestToken?: string | null;
  text: string;
  replyToId?: number;
}

export interface SendAdminReplyInput {
  threadId: number;
  adminId: number;
  text: string;
  replyToId?: number;
}

export async function getOrCreateThread({
  userId,
  guestToken,
}: {
  userId?: number | null;
  guestToken?: string | null;
}) {
  if (userId) {
    let thread = await prisma.supportThread.findFirst({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!thread) {
      thread = await prisma.supportThread.create({
        data: { userId },
      });
    }
    return thread;
  }

  if (guestToken) {
    let thread = await prisma.supportThread.findFirst({
      where: { guestToken },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!thread) {
      thread = await prisma.supportThread.create({
        data: { guestToken },
      });
    }
    return thread;
  }

  throw new Error("Необходимо указать userId или guestToken");
}

export async function getUserThreadWithMessages({
  userId,
  guestToken,
}: {
  userId?: number | null;
  guestToken?: string | null;
}) {
  if (!userId && !guestToken) {
    return null;
  }

  try {
    const where = userId ? { userId } : { guestToken };
    const thread = await prisma.supportThread.findFirst({
      where,
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            replyTo: {
              select: { id: true, text: true, senderRole: true },
            },
          },
        },
      },
    });

    return thread;
  } catch (error) {
    console.error("[SupportService] Не удалось загрузить тред поддержки:", error);
    return null;
  }
}

export async function sendUserMessage(input: SendUserMessageInput) {
  const thread = await getOrCreateThread({
    userId: input.userId,
    guestToken: input.guestToken,
  });

  const message = await prisma.supportMessage.create({
    data: {
      threadId: thread.id,
      senderRole: "user",
      senderId: input.userId ?? null,
      text: input.text.trim(),
      replyToId: input.replyToId ?? null,
    },
    include: {
      replyTo: {
        select: { id: true, text: true, senderRole: true },
      },
    },
  });

  const updatedThread = await prisma.supportThread.update({
    where: { id: thread.id },
    data: {
      status: "open",
      lastMessageAt: new Date(),
      unreadByAdmin: { increment: 1 },
    },
  });

  return { message, thread: updatedThread };
}

export async function markThreadReadByUser({
  threadId,
  userId,
  guestToken,
}: {
  threadId: number;
  userId?: number | null;
  guestToken?: string | null;
}) {
  if (!userId && !guestToken) {
    return null;
  }

  const where: Prisma.SupportThreadWhereInput = { id: threadId };
  if (userId) {
    where.userId = userId;
  } else if (guestToken) {
    where.guestToken = guestToken;
  }

  const thread = await prisma.supportThread.findFirst({ where });
  if (!thread) return null;

  return prisma.supportThread.update({
    where: { id: threadId },
    data: { unreadByUser: 0 },
  });
}

export async function getAdminThreads(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { status = "all", search, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.SupportThreadWhereInput = {};
  if (status && status !== "all") {
    where.status = status;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { user: { username: { contains: q, mode: "insensitive" } } },
      { messages: { some: { text: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [threads, total] = await Promise.all([
    prisma.supportThread.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastMessageAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, email: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, text: true, senderRole: true, createdAt: true },
        },
      },
    }),
    prisma.supportThread.count({ where }),
  ]);

  return { threads, total, page, limit };
}

export async function getThreadMessages(threadId: number) {
  const thread = await prisma.supportThread.findUnique({
    where: { id: threadId },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true, email: true },
      },
    },
  });

  if (!thread) return null;

  // Сбрасываем непрочитанные для администратора
  await prisma.supportThread.update({
    where: { id: threadId },
    data: { unreadByAdmin: 0 },
  });

  const messages = await prisma.supportMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    include: {
      replyTo: {
        select: { id: true, text: true, senderRole: true },
      },
    },
  });

  return { thread, messages };
}

export async function sendAdminReply(input: SendAdminReplyInput) {
  const message = await prisma.supportMessage.create({
    data: {
      threadId: input.threadId,
      senderRole: "admin",
      senderId: input.adminId,
      text: input.text.trim(),
      replyToId: input.replyToId ?? null,
    },
    include: {
      replyTo: {
        select: { id: true, text: true, senderRole: true },
      },
    },
  });

  const thread = await prisma.supportThread.update({
    where: { id: input.threadId },
    data: {
      status: "answered",
      lastMessageAt: new Date(),
      unreadByUser: { increment: 1 },
      unreadByAdmin: 0,
    },
  });

  return { message, thread };
}

export async function deleteMessage(messageId: number) {
  return prisma.supportMessage.delete({
    where: { id: messageId },
  });
}

export async function deleteThread(threadId: number) {
  return prisma.supportThread.delete({
    where: { id: threadId },
  });
}

export async function updateThreadStatus(threadId: number, status: string) {
  return prisma.supportThread.update({
    where: { id: threadId },
    data: { status },
  });
}
