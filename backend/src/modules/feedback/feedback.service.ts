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

export async function getAllFeedback(params?: {
  skip?: number;
  take?: number;
  status?: string;
  type?: string;
}) {
  const { skip = 0, take = 50, status, type } = params ?? {};

  const where: any = {};
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
