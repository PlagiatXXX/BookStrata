import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export interface CreateFeedbackInput {
  userId?: number | null;
  type: string;
  message: string;
  rating?: string | null;
  pageUrl?: string | null;
  userEmail?: string | null;
}

export async function dismissFeedback(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { feedbackDismissedAt: new Date() },
  });
}

export async function createFeedback(input: CreateFeedbackInput) {
  let messageToSave = input.message;
  if (input.rating) {
    messageToSave = input.message?.trim()
      ? `[Оценка: ${input.rating}] ${input.message.trim()}`
      : `[Оценка: ${input.rating}]`;
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: input.userId ?? null,
      type: input.type,
      message: messageToSave,
      pageUrl: input.pageUrl ?? null,
      userEmail: input.userEmail ?? null,
    },
  });

  if (input.userId) {
    await dismissFeedback(input.userId).catch((err) => {
      console.warn("[feedback] Failed to update feedbackDismissedAt:", err);
    });
  }

  return feedback;
}

export async function getAllFeedback(params?: {
  skip?: number;
  take?: number;
  status?: string;
  type?: string;
}) {
  const { skip = 0, take = 50, status, type } = params ?? {};

  const where: Prisma.FeedbackWhereInput = {};
  if (status) where.status = status;
  if (type) where.type = type;

  return prisma.feedback.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });
}

export async function updateFeedbackStatus(id: number, status: string) {
  return prisma.feedback.update({
    where: { id },
    data: { status },
  });
}

export async function deleteFeedback(id: number) {
  await prisma.feedback.delete({ where: { id } });
}
