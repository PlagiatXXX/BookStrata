import type { FastifyInstance } from "fastify";

export interface CreateFlagInput {
  userId: number;
  imageUrl: string;
  flagType: string;
  targetId?: string | null;
  nsfwScore?: number | null;
}

export interface FlagListItem {
  id: number;
  userId: number;
  username: string | null;
  avatarUrl: string | null;
  imageUrl: string;
  flagType: string;
  targetId: string | null;
  nsfwScore: number | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByUsername: string | null;
}

export async function createFlag(
  fastify: FastifyInstance,
  input: CreateFlagInput,
) {
  return fastify.prisma.contentFlag.create({
    data: {
      userId: input.userId,
      imageUrl: input.imageUrl,
      flagType: input.flagType,
      targetId: input.targetId ?? null,
      nsfwScore: input.nsfwScore ?? null,
      status: "pending",
    },
  });
}

export async function getFlags(
  fastify: FastifyInstance,
  status?: string,
  page = 1,
  pageSize = 20,
): Promise<{ flags: FlagListItem[]; total: number }> {
  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    fastify.prisma.contentFlag.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        resolvedBy: { select: { username: true } },
      },
    }),
    fastify.prisma.contentFlag.count({ where }),
  ]);

  return {
    flags: items.map((f) => ({
      id: f.id,
      userId: f.userId,
      username: f.user.username,
      avatarUrl: f.user.avatarUrl,
      imageUrl: f.imageUrl,
      flagType: f.flagType,
      targetId: f.targetId,
      nsfwScore: f.nsfwScore,
      status: f.status,
      createdAt: f.createdAt,
      resolvedAt: f.resolvedAt,
      resolvedByUsername: f.resolvedBy?.username ?? null,
    })),
    total,
  };
}

export async function resolveFlag(
  fastify: FastifyInstance,
  flagId: number,
  resolvedById: number,
  status: "resolved" | "dismissed",
) {
  return fastify.prisma.contentFlag.update({
    where: { id: flagId },
    data: { status, resolvedAt: new Date(), resolvedById },
  });
}
