import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    battle: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    battleParticipant: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    battleVote: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    battleApplication: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tierList: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(tx)),
  };
  return { prisma: tx };
});

vi.mock("../../lib/event-emitter.js", () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../repositories/index.js", () => ({
  tierListRepository: {
    findByIds: vi.fn(),
  },
}));

import * as service from "./battles.service.js";
import { prisma } from "../../lib/prisma.js";
import { eventBus } from "../../lib/event-emitter.js";
import { tierListRepository } from "../../repositories/index.js";

describe("Battles Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockUserId = 1;
  const mockBattleId = "battle-uuid-1";
  const mockTierListId = "tierlist-uuid-1";

  const mockTierList = { id: mockTierListId, title: "My List", userId: mockUserId, isPublic: true };
  const mockParticipant = { id: 1, battleId: mockBattleId, tierListId: mockTierListId, votesCount: 0 };

  describe("createBattle", () => {
    const createInput = {
      title: "Weekly Battle",
      type: "weekly" as const,
      endTime: new Date(Date.now() + 86400000),
      participantTierListIds: [mockTierListId],
    };

    it("должен создать битву с участниками", async () => {
      (tierListRepository.findByIds as any).mockResolvedValue([mockTierList]);
      const createdBattle = { id: mockBattleId, ...createInput, participants: [mockParticipant] };
      (prisma.battle.create as any).mockResolvedValue(createdBattle);

      const result = await service.createBattle(createInput);

      expect(tierListRepository.findByIds).toHaveBeenCalledWith([mockTierListId]);
      expect(prisma.battle.create).toHaveBeenCalledWith({
        data: {
          title: createInput.title,
          description: null,
          type: createInput.type,
          endTime: createInput.endTime,
          participants: {
            create: [{ tierListId: mockTierListId }],
          },
        },
        include: { participants: true },
      });
      expect(result).toEqual(createdBattle);
    });

    it("должен выбросить ошибку если тир-лист не найден", async () => {
      (tierListRepository.findByIds as any).mockResolvedValue([]);

      await expect(service.createBattle(createInput)).rejects.toThrow(
        "One or more tier lists are not found or not public",
      );
      expect(prisma.battle.create).not.toHaveBeenCalled();
    });

    it("должен передать templateId если указан", async () => {
      (tierListRepository.findByIds as any).mockResolvedValue([mockTierList]);
      (prisma.battle.create as any).mockResolvedValue({ id: mockBattleId });

      await service.createBattle({ ...createInput, templateId: "template-uuid" });

      expect(prisma.battle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: "template-uuid",
          }),
        }),
      );
    });
  });

  describe("getActiveBattles", () => {
    it("должен вернуть список активных битв", async () => {
      const mockBattles = [{ id: mockBattleId, title: "Active Battle" }];
      (prisma.battle.findMany as any).mockResolvedValue(mockBattles);

      const result = await service.getActiveBattles();

      expect(prisma.battle.findMany).toHaveBeenCalledWith({
        where: {
          status: "active",
          endTime: { gt: expect.any(Date) },
        },
        include: expect.any(Object),
        orderBy: { endTime: "asc" },
      });
      expect(result).toEqual(mockBattles);
    });

    it("должен вернуть пустой массив если нет активных битв", async () => {
      (prisma.battle.findMany as any).mockResolvedValue([]);

      const result = await service.getActiveBattles();

      expect(result).toEqual([]);
    });
  });

  describe("getBattleById", () => {
    it("должен вернуть битву по ID", async () => {
      const mockBattle = { id: mockBattleId, title: "Test Battle", participants: [] };
      (prisma.battle.findUnique as any).mockResolvedValue(mockBattle);

      const result = await service.getBattleById(mockBattleId);

      expect(prisma.battle.findUnique).toHaveBeenCalledWith({
        where: { id: mockBattleId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockBattle);
    });

    it("должен вернуть null если битва не найдена", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(null);

      const result = await service.getBattleById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("voteInBattle", () => {
    const activeBattle = {
      id: mockBattleId,
      status: "active",
      endTime: new Date(Date.now() + 86400000),
    };

    it("должен проголосовать в активной битве", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(activeBattle);
      (prisma.battleParticipant.findUnique as any).mockResolvedValue(mockParticipant);
      (prisma.battleVote.create as any).mockResolvedValue({});
      (prisma.battleParticipant.update as any).mockResolvedValue({ ...mockParticipant, votesCount: 1 });

      const result = await service.voteInBattle(mockUserId, mockBattleId, mockTierListId);

      expect(prisma.battle.findUnique).toHaveBeenCalledWith({
        where: { id: mockBattleId },
      });
      expect(prisma.battleParticipant.findUnique).toHaveBeenCalledWith({
        where: {
          battleId_tierListId: { battleId: mockBattleId, tierListId: mockTierListId },
        },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("должен выбросить ошибку если битва не активна", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue({ ...activeBattle, status: "completed" });

      await expect(
        service.voteInBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("Battle is not active or has ended");
    });

    it("должен выбросить ошибку если битва закончилась", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue({
        ...activeBattle,
        endTime: new Date(Date.now() - 86400000),
      });

      await expect(
        service.voteInBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("Battle is not active or has ended");
    });

    it("должен выбросить ошибку если тир-лист не участник", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(activeBattle);
      (prisma.battleParticipant.findUnique as any).mockResolvedValue(null);

      await expect(
        service.voteInBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("Tier list is not a participant in this battle");
    });

    it("должен пробросить P2002 ошибку (двойной голос)", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(activeBattle);
      (prisma.battleParticipant.findUnique as any).mockResolvedValue(mockParticipant);
      const p2002Error = new Error("Unique constraint");
      (p2002Error as any).code = "P2002";
      (prisma.$transaction as any).mockRejectedValue(p2002Error);

      await expect(
        service.voteInBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("Unique constraint");
    });
  });

  describe("closeBattle", () => {
    it("должен закрыть битву и определить победителя", async () => {
      const winnerParticipant = {
        id: 2,
        tierListId: mockTierListId,
        votesCount: 10,
        tierList: { userId: mockUserId },
      };
      const loserParticipant = {
        id: 3,
        tierListId: "loser-list-id",
        votesCount: 3,
        tierList: { userId: 2 },
      };
      const battleWithParticipants = {
        id: mockBattleId,
        status: "active",
        participants: [winnerParticipant, loserParticipant],
      };
      const updatedBattle = { ...battleWithParticipants, status: "completed", winnerId: mockTierListId };

      (prisma.battle.findUnique as any).mockResolvedValue(battleWithParticipants);
      (prisma.battle.update as any).mockResolvedValue(updatedBattle);

      const result = await service.closeBattle(mockBattleId);

      expect(prisma.battle.findUnique).toHaveBeenCalledWith({
        where: { id: mockBattleId },
        include: expect.any(Object),
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith("battle:won", { userId: mockUserId });
      expect(eventBus.emit).toHaveBeenCalledWith("battle:participated", { userId: mockUserId });
    });

    it("должен выбросить ошибку если битва не найдена", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(null);

      await expect(service.closeBattle("non-existent")).rejects.toThrow("Battle not found");
    });

    it("должен выбросить ошибку если битва уже завершена", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue({ id: mockBattleId, status: "completed", participants: [] });

      await expect(service.closeBattle(mockBattleId)).rejects.toThrow("Battle already completed");
    });

    it("должен закрыть битву без участников", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue({ id: mockBattleId, status: "active", participants: [] });
      (prisma.battle.update as any).mockResolvedValue({ id: mockBattleId, status: "completed" });

      const result = await service.closeBattle(mockBattleId);

      expect(prisma.battle.update).toHaveBeenCalledWith({
        where: { id: mockBattleId },
        data: { status: "completed" },
      });
    });
  });

  describe("applyToBattle", () => {
    const activeBattle = {
      id: mockBattleId,
      status: "active",
      endTime: new Date(Date.now() + 86400000),
    };

    it("должен создать заявку на битву", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(activeBattle);
      (prisma.tierList.findFirst as any).mockResolvedValue(mockTierList);
      (prisma.battleParticipant.findUnique as any).mockResolvedValue(null);
      const mockApplication = { id: 1, battleId: mockBattleId, userId: mockUserId, tierListId: mockTierListId };
      (prisma.battleApplication.create as any).mockResolvedValue(mockApplication);

      const result = await service.applyToBattle(mockUserId, mockBattleId, mockTierListId, "Pick me!");

      expect(prisma.battle.findUnique).toHaveBeenCalledWith({
        where: { id: mockBattleId },
        select: { id: true, status: true, endTime: true },
      });
      expect(prisma.tierList.findFirst).toHaveBeenCalledWith({
        where: { id: mockTierListId, userId: mockUserId, isPublic: true },
      });
      expect(result).toEqual(mockApplication);
    });

    it("должен выбросить ошибку если битва не активна", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue({ ...activeBattle, status: "completed" });

      await expect(
        service.applyToBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("Battle is not active or has ended");
    });

    it("должен выбросить ошибку если тир-лист не найден", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(activeBattle);
      (prisma.tierList.findFirst as any).mockResolvedValue(null);

      await expect(
        service.applyToBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("Tier list not found or not public");
    });

    it("должен выбросить ошибку если тир-лист уже участвует", async () => {
      (prisma.battle.findUnique as any).mockResolvedValue(activeBattle);
      (prisma.tierList.findFirst as any).mockResolvedValue(mockTierList);
      (prisma.battleParticipant.findUnique as any).mockResolvedValue(mockParticipant);

      await expect(
        service.applyToBattle(mockUserId, mockBattleId, mockTierListId),
      ).rejects.toThrow("This tier list is already participating in the battle");
    });
  });

  describe("applyGeneral", () => {
    it("должен создать общую заявку", async () => {
      (prisma.tierList.findFirst as any).mockResolvedValue(mockTierList);
      const mockApplication = { id: 1, battleId: null, userId: mockUserId, tierListId: mockTierListId };
      (prisma.battleApplication.create as any).mockResolvedValue(mockApplication);

      const result = await service.applyGeneral(mockUserId, mockTierListId, "Want to join");

      expect(prisma.tierList.findFirst).toHaveBeenCalledWith({
        where: { id: mockTierListId, userId: mockUserId, isPublic: true },
      });
      expect(prisma.battleApplication.create).toHaveBeenCalledWith({
        data: { battleId: null, userId: mockUserId, tierListId: mockTierListId, message: "Want to join" },
      });
      expect(result).toEqual(mockApplication);
    });

    it("должен выбросить ошибку если тир-лист не найден", async () => {
      (prisma.tierList.findFirst as any).mockResolvedValue(null);

      await expect(service.applyGeneral(mockUserId, mockTierListId)).rejects.toThrow(
        "Tier list not found or not public",
      );
    });
  });

  describe("getApplications", () => {
    it("должен вернуть заявки битвы", async () => {
      const mockApplications = [
        { id: 1, battleId: mockBattleId, userId: mockUserId, status: "pending" },
      ];
      (prisma.battleApplication.findMany as any).mockResolvedValue(mockApplications);

      const result = await service.getApplications(mockBattleId);

      expect(prisma.battleApplication.findMany).toHaveBeenCalledWith({
        where: { battleId: mockBattleId },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockApplications);
    });
  });

  describe("getPendingApplications", () => {
    it("должен вернуть ожидающие заявки", async () => {
      const mockApps = [{ id: 1, status: "pending" }];
      (prisma.battleApplication.findMany as any).mockResolvedValue(mockApps);

      const result = await service.getPendingApplications();

      expect(prisma.battleApplication.findMany).toHaveBeenCalledWith({
        where: { status: "pending" },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockApps);
    });
  });

  describe("getApprovedApplications", () => {
    it("должен вернуть одобренные заявки без battleId", async () => {
      const mockApps = [{ id: 1, status: "approved", battleId: null }];
      (prisma.battleApplication.findMany as any).mockResolvedValue(mockApps);

      const result = await service.getApprovedApplications();

      expect(prisma.battleApplication.findMany).toHaveBeenCalledWith({
        where: { status: "approved", battleId: null },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockApps);
    });
  });

  describe("reviewApplication", () => {
    const mockApplication = {
      id: 1,
      battleId: mockBattleId,
      tierListId: mockTierListId,
      status: "pending",
    };

    it("должен отклонить заявку", async () => {
      (prisma.battleApplication.findFirst as any).mockResolvedValue(mockApplication);
      (prisma.battleApplication.update as any).mockResolvedValue({ ...mockApplication, status: "rejected" });

      const result = await service.reviewApplication(mockBattleId, 1, "rejected");

      expect(prisma.battleApplication.findFirst).toHaveBeenCalledWith({
        where: { id: 1, battleId: mockBattleId },
      });
      expect(prisma.battleApplication.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "rejected" },
      });
    });

    it("должен одобрить общую заявку (без battleId)", async () => {
      const generalApp = { ...mockApplication, battleId: null };
      (prisma.battleApplication.findFirst as any).mockResolvedValue(generalApp);
      (prisma.battleApplication.update as any).mockResolvedValue({ ...generalApp, status: "approved" });

      const result = await service.reviewApplication(null, 1, "approved");

      expect(prisma.battleApplication.findFirst).toHaveBeenCalledWith({
        where: { id: 1, battleId: null },
      });
      expect(result).toEqual({ ...generalApp, status: "approved" });
    });

    it("должен одобрить заявку на битву и создать участника", async () => {
      (prisma.battleApplication.findFirst as any).mockResolvedValue(mockApplication);
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(prisma));

      const result = await service.reviewApplication(mockBattleId, 1, "approved");

      expect(prisma.battleApplication.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "approved" },
      });
      expect(prisma.battleParticipant.create).toHaveBeenCalledWith({
        data: { battleId: mockBattleId, tierListId: mockTierListId },
      });
      expect(result).toEqual({ success: true });
    });

    it("должен выбросить ошибку если заявка не найдена", async () => {
      (prisma.battleApplication.findFirst as any).mockResolvedValue(null);

      await expect(service.reviewApplication(mockBattleId, 999, "approved")).rejects.toThrow(
        "Application not found",
      );
    });

    it("должен выбросить ошибку если заявка уже рассмотрена", async () => {
      (prisma.battleApplication.findFirst as any).mockResolvedValue({ ...mockApplication, status: "approved" });

      await expect(service.reviewApplication(mockBattleId, 1, "rejected")).rejects.toThrow(
        "Application already reviewed",
      );
    });
  });
});
