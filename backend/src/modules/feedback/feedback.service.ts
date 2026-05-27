import { prisma } from "../../lib/prisma.js";

export interface CreateFeedbackInput {
  userId?: number | null;
  type: string;
  message: string;
  pageUrl?: string | null;
  userEmail?: string | null;
}

export async function createFeedback(input: CreateFeedbackInput) {
  return prisma.feedback.create({
    data: {
      userId: input.userId ?? null,
      type: input.type,
      message: input.message,
      pageUrl: input.pageUrl ?? null,
      userEmail: input.userEmail ?? null,
    },
  });
}

export async function getAllFeedback() {
  return prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });
}

export async function updateFeedbackStatus(
  id: number,
  status: string,
) {
  return prisma.feedback.update({
    where: { id },
    data: { status },
  });
}

export async function deleteFeedback(id: number) {
  await prisma.feedback.delete({ where: { id } });
}
