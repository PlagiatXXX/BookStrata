import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { eventBus } from "../../lib/event-emitter.js";
import { tierListRepository } from "../../repositories/index.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";

const logger = createLogger("Battles", { color: "magenta" });

export interface CreateBattleInput {
  templateId?: string;
  title: string;
  description?: string | null;
  type: "weekly" | "monthly";
  endTime: Date;
  participantTierListIds: string[];
}

export async function createBattle(data: CreateBattleInput) {
  logger.info("Creating new battle", { title: data.title, type: data.type });

// Проверяем, что все тир-листы существуют и публичны
const tierLists = await tierListRepository.findByIds(data.participantTierListIds);
 
if (tierLists.length !== data.participantTierListIds.length) {
throw new NotFoundError("One or more tier lists are not found or not public");
}

  return prisma.battle.create({
    data: {
      ...(data.templateId ? { templateId: data.templateId } : {}),
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      endTime: data.endTime,
      participants: {
        create: data.participantTierListIds.map((id) => ({
          tierListId: id,
        })),
      },
    },
    include: {
      participants: true,
    },
  });
}

export async function getActiveBattles() {
  return prisma.battle.findMany({
    where: {
      status: "active",
      endTime: {
        gt: new Date(),
      },
    },
    include: {
      template: {
        select: { title: true },
      },
      participants: {
        include: {
          tierList: {
            select: {
              id: true,
              title: true,
              userId: true,
              user: {
                select: { username: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
    orderBy: { endTime: "asc" },
  });
}

export async function getBattleById(id: string) {
  return prisma.battle.findUnique({
    where: { id },
    include: {
      template: true,
      participants: {
        include: {
          tierList: {
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true },
              },
              tiers: {
                include: {
                  items: {
                    include: { book: true },
                    orderBy: { rank: "asc" },
                  },
                },
                orderBy: { rank: "asc" },
              },
              placements: {
                include: {
                  book: true,
                },
                orderBy: { rank: "asc" },
              },
            },
          },
        },
      },
    },
  });
}

export async function voteInBattle(userId: number, battleId: string, tierListId: string) {
  logger.info("User voting in battle", { userId, battleId, tierListId });

  // Проверяем, существует ли битва и активна ли она
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
  });

  if (!battle || battle.status !== "active" || battle.endTime < new Date()) {
    throw new ValidationError("Battle is not active or has ended");
  }

  // Проверяем, является ли тир-лист участником битвы
  const participant = await prisma.battleParticipant.findUnique({
    where: {
      battleId_tierListId: {
        battleId,
        tierListId,
      },
    },
  });

  if (!participant) {
    throw new NotFoundError("Tier list is not a participant in this battle");
  }

  return prisma.$transaction(async (tx) => {
    // Создаем голос (уникальность по [userId, battleId] в БД гарантирует один голос)
    await tx.battleVote.create({
      data: {
        userId,
        battleId,
        tierListId,
      },
    });

    // Увеличиваем счетчик голосов участника
    await tx.battleParticipant.update({
      where: { id: participant.id },
      data: {
        votesCount: { increment: 1 },
      },
    });

    return { success: true };
  });
}

export async function closeBattle(battleId: string) {
  logger.info("Closing battle", { battleId });

  const battle = await getBattleById(battleId);
  if (!battle) throw new NotFoundError("Battle not found");
  if (battle.status === "completed") throw new ValidationError("Battle already completed");

  if (battle.participants.length === 0) {
     return prisma.battle.update({
       where: { id: battleId },
       data: { status: "completed" }
     });
  }

  // Находим победителя (участник с макс. голосов)
  const winner = battle.participants.reduce((prev, curr) =>
    (curr.votesCount > prev.votesCount) ? curr : prev
  );

  return prisma.$transaction(async (tx) => {
    // 1. Обновляем статус битвы
    const updatedBattle = await tx.battle.update({
      where: { id: battleId },
      data: {
        status: "completed",
        winnerId: winner.tierListId,
      },
    });

    // 2. Начисляем XP и ачивки участникам и победителю
    // Всем участникам по 50 XP
    for (const p of battle.participants) {
       await tx.user.update({
         where: { id: p.tierList.userId },
         data: { xp: { increment: 50 } }
       });

       // Выдаем ачивку за участие
       await eventBus.emit("battle:participated", { userId: p.tierList.userId });
    }

    // Победителю еще 200 XP
    if (winner && winner.tierList) {
      await tx.user.update({
        where: { id: winner.tierList.userId },
        data: { xp: { increment: 200 } }
      });

      await eventBus.emit("battle:won", { userId: winner.tierList.userId });
    }

    return updatedBattle;
  });
}

const subscriptionsService = new SubscriptionsService();

async function checkFreeBattleLimit(userId: number): Promise<void> {
  const isPro = await subscriptionsService.isProUser(userId);
  if (isPro) return;

  // Free users: max 1 battle application per week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentApplications = await prisma.battleApplication.count({
    where: { userId, createdAt: { gte: weekAgo } },
  });

  if (recentApplications >= 1) {
    throw new ValidationError("Бесплатные пользователи могут подать заявку на участие в битве не чаще раза в неделю");
  }
}

// Заявки на участие
export async function applyToBattle(userId: number, battleId: string, tierListId: string, message?: string) {
  logger.info("User applying to battle", { userId, battleId, tierListId });

  await checkFreeBattleLimit(userId);

  // Проверяем существование и активность битвы
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    select: { id: true, status: true, endTime: true },
  });

  if (!battle || battle.status !== "active" || battle.endTime < new Date()) {
    throw new ValidationError("Battle is not active or has ended");
  }

  // Проверяем, что тир-лист существует и принадлежит пользователю
  const tierList = await prisma.tierList.findFirst({
    where: { id: tierListId, userId, isPublic: true },
  });

  if (!tierList) {
    throw new NotFoundError("Tier list not found or not public");
  }

  // Проверяем, не участвует ли уже этот тир-лист в битве
  const existingParticipant = await prisma.battleParticipant.findUnique({
    where: { battleId_tierListId: { battleId, tierListId } },
  });

  if (existingParticipant) {
    throw new ValidationError("This tier list is already participating in the battle");
  }

  return prisma.battleApplication.create({
    data: { battleId, userId, tierListId, message: message ?? null },
  });
}

// Общая заявка — без привязки к конкретной битве
export async function applyGeneral(userId: number, tierListId: string, message?: string) {
  logger.info("User submitting general application", { userId, tierListId });

  await checkFreeBattleLimit(userId);

  const tierList = await prisma.tierList.findFirst({
    where: { id: tierListId, userId, isPublic: true },
  });

  if (!tierList) {
    throw new NotFoundError("Tier list not found or not public");
  }

  return prisma.battleApplication.create({
    data: { battleId: null, userId, tierListId, message: message ?? null },
  });
}

export async function getApplications(battleId: string) {
  return prisma.battleApplication.findMany({
    where: { battleId },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      tierList: { select: { id: true, title: true, isPublic: true } },
      battle: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingApplications() {
  return prisma.battleApplication.findMany({
    where: { status: "pending" },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      tierList: { select: { id: true, title: true, isPublic: true } },
      battle: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApprovedApplications() {
  return prisma.battleApplication.findMany({
    where: { status: "approved", battleId: null },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      tierList: { select: { id: true, title: true, isPublic: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewApplication(battleId: string | null, applicationId: number, status: "approved" | "rejected") {
  logger.info("Reviewing battle application", { battleId, applicationId, status });

  const where = battleId
    ? { id: applicationId, battleId }
    : { id: applicationId, battleId: null };

  const application = await prisma.battleApplication.findFirst({ where });

  if (!application) {
    throw new NotFoundError("Application not found");
  }

  if (application.status !== "pending") {
    throw new ValidationError("Application already reviewed");
  }

  if (status === "rejected") {
    return prisma.battleApplication.update({
      where: { id: applicationId },
      data: { status: "rejected" },
    });
  }

  // Одобрение — если заявка на конкретную битву, добавляем участника
  if (!battleId) {
    return prisma.battleApplication.update({
      where: { id: applicationId },
      data: { status: "approved" },
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.battleApplication.update({
      where: { id: applicationId },
      data: { status: "approved" },
    });

    await tx.battleParticipant.create({
      data: {
        battleId,
        tierListId: application.tierListId,
      },
    });

    return { success: true };
  });
}
