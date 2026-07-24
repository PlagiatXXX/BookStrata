/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import { NotFoundError, AuthorizationError } from "../lib/errors.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const getWhereClause = (id: string) => {
  if (isUuid(id)) return { id };
  if (/^\d+$/.test(id)) return { id };
  return { slug: id };
};

export class TierListRepository {
  constructor(private db: PrismaClient) {}

  // ─── Resolution ───────────────────────────────────────────────

  async resolveId(id: string, tx?: TxClient): Promise<string> {
    const client = tx || this.db;
    const tierList = await client.tierList.findUnique({
      where: getWhereClause(id),
      select: { id: true },
    });
    if (!tierList) {
      throw new Error("Tier list not found");
    }
    return tierList.id;
  }

  async getOwner(id: string, tx?: TxClient): Promise<number> {
    const client = tx || this.db;
    const list = await client.tierList.findUnique({
      where: getWhereClause(id),
      select: { userId: true },
    });
    if (!list) {
      throw new NotFoundError("Тир-лист не найден");
    }
    return list.userId;
  }

  async assertOwner(id: string, userId: number) {
    const ownerId = await this.getOwner(id);
    if (ownerId !== userId) {
      throw new AuthorizationError("Forbidden");
    }
  }

  // ─── Read ─────────────────────────────────────────────────────

  async findById(id: string, options?: { select?: any; include?: any }) {
    return this.db.tierList.findUnique({
      where: getWhereClause(id),
      ...options,
    });
  }

  async findUniqueOrThrow(id: string, options?: { include?: any }) {
    return this.db.tierList.findUniqueOrThrow({
      where: getWhereClause(id),
      ...options,
    });
  }

  async findByUser(userId: number, pagination: { page: number; pageSize: number }) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    return Promise.all([
      this.db.tierList.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          likesCount: true,
          slug: true,
          coverImageUrl: true,
          user: { select: { username: true, avatarUrl: true } },
          _count: { select: { placements: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: pagination.pageSize,
        skip,
      }),
      this.db.tierList.count({ where: { userId } }),
    ]);
  }

  async findPublicByUserId(userId: number, pagination: { page: number; pageSize: number }) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    return Promise.all([
      this.db.tierList.findMany({
        where: { userId, isPublic: true },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          likesCount: true,
          slug: true,
          coverImageUrl: true,
          user: { select: { username: true, avatarUrl: true } },
          _count: { select: { placements: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: pagination.pageSize,
        skip,
      }),
      this.db.tierList.count({ where: { userId, isPublic: true } }),
    ]);
  }

  async findPublic(options: { page: number; pageSize: number; sortBy?: string }) {
    const skip = (options.page - 1) * options.pageSize;

    // Стабильная сортировка: основное поле + tiebreaker по id,
    // чтобы избежать дубликатов при offset-пагинации
    const primaryOrder =
      options.sortBy === "likes"
        ? { likesCount: "desc" as const }
        : options.sortBy === "updatedAt" || options.sortBy === "updated_at"
          ? { updatedAt: "desc" as const }
          : { createdAt: "desc" as const };

    const orderBy = [primaryOrder, { id: "desc" as const }];

    return Promise.all([
      this.db.tierList.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          likesCount: true,
          slug: true,
          coverImageUrl: true,
          user: { select: { username: true, avatarUrl: true } },
          _count: { select: { placements: true } },
        },
        orderBy,
        take: options.pageSize,
        skip,
      }),
      this.db.tierList.count({ where: { isPublic: true } }),
    ]);
  }

  async findLikedByUser(userId: number, pagination: { page: number; pageSize: number }) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const [likes, totalItems] = await Promise.all([
      this.db.tierListLike.findMany({
        where: { userId },
        include: {
          tierList: {
            select: {
              id: true,
              title: true,
              slug: true,
              createdAt: true,
              updatedAt: true,
              isPublic: true,
              likesCount: true,
              coverImageUrl: true,
              user: { select: { username: true, avatarUrl: true } },
              _count: { select: { placements: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pagination.pageSize,
        skip,
      }),
      this.db.tierListLike.count({ where: { userId } }),
    ]);

    const data = likes.map((l) => ({
      ...l.tierList,
      booksCount: (l.tierList as unknown as { _count: { placements: number } })._count?.placements ?? 0,
      _count: undefined,
    }));

    return [data, totalItems] as const;
  }

  async findByIds(ids: string[]) {
    return this.db.tierList.findMany({
      where: { id: { in: ids }, isPublic: true },
    });
  }

  async findUserTierListIds(userId: number): Promise<string[]> {
    const lists = await this.db.tierList.findMany({
      where: { userId },
      select: { id: true },
    });
    return lists.map((l: { id: string }) => l.id);
  }

  async countByUser(userId: number) {
    return this.db.tierList.count({ where: { userId } });
  }

  async countUserForks(userId: number) {
    return this.db.tierList.count({
      where: { userId, originalTierListId: { not: null } },
    });
  }

  async aggregateUserStats(userId: number) {
    return this.db.tierList.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { likesCount: true },
    });
  }

  async getMetadata(id: string) {
    return this.db.tierList.findUnique({
      where: getWhereClause(id),
      select: {
        id: true,
        title: true,
        userId: true,
        isPublic: true,
        updatedAt: true,
      },
    });
  }

  // ─── Write ────────────────────────────────────────────────────

  async create(userId: number, data: { title: string; slug: string }) {
    return this.db.tierList.create({
      data: {
        userId,
        title: data.title,
        slug: data.slug,
        isPublic: true,
        tiers: {
          create: [
            { title: "Шедевр", color: "#FF6B6B", rank: 0 },
            { title: "Отлично", color: "#4ECDC4", rank: 1 },
            { title: "Хорошо", color: "#45B7D1", rank: 2 },
            { title: "Средне", color: "#96CEB4", rank: 3 },
            { title: "Плохо", color: "#FFEAA7", rank: 4 },
          ],
        },
      },
      include: {
        tiers: {
          orderBy: { rank: "asc" },
          include: { items: { orderBy: { rank: "asc" }, include: { book: true } } },
        },
        placements: {
          where: { tierId: null },
          include: { book: true },
          orderBy: { rank: "asc" },
        },
      },
    });
  }

  async update(id: string, data: { title?: string; isPublic?: boolean; year?: number; theme?: string; coverImageUrl?: string }) {
    return this.db.tierList.update({
      where: getWhereClause(id),
      data,
    });
  }

  async updateTimestamp(id: string, tx?: TxClient) {
    const client = tx || this.db;
    return client.tierList.update({
      where: getWhereClause(id),
      data: { updatedAt: new Date() },
    });
  }

  async delete(id: string) {
    return this.db.tierList.delete({
      where: getWhereClause(id),
    });
  }

  async togglePublic(id: string, isPublic: boolean) {
    return this.db.tierList.update({
      where: getWhereClause(id),
      data: { isPublic },
      select: { id: true, isPublic: true },
    });
  }

  // ─── Full fetch (for routes) ──────────────────────────────────

  async getFullTierList(id: string) {
    const tierList = await this.db.tierList.findUniqueOrThrow({
      where: getWhereClause(id),
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        tiers: {
          orderBy: { rank: "asc" },
          include: {
            items: { orderBy: { rank: "asc" }, include: { book: true } },
          },
        },
        placements: {
          where: { tierId: null },
          include: { book: true },
          orderBy: { rank: "asc" },
        },
      },
    });

    const { placements: unrankedBooks, ...rest } = tierList;
    return { ...rest, unrankedBooks };
  }

  async getForkSource(id: string) {
    return this.db.tierList.findUniqueOrThrow({
      where: getWhereClause(id),
      include: {
        tiers: { orderBy: { rank: "asc" } },
        placements: {
          include: { book: true },
          orderBy: { rank: "asc" },
        },
      },
    });
  }
}
