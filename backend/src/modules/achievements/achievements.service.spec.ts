import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from './achievements.service';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    achievement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    tierList: {
      count: vi.fn(),
    },
    bookPlacement: {
      count: vi.fn(),
    },
    tierListLike: {
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe('achievements.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should grant achievement and update XP', async () => {
    const userId = 1;
    const achievementId = 'first_tier_list' as any;
    const achievement = { id: achievementId, xpValue: 20 };

    (prisma.userAchievement.findUnique as any).mockResolvedValue(null);
    (prisma.achievement.findUnique as any).mockResolvedValue(achievement);
    (prisma.userAchievement.create as any).mockResolvedValue({ achievement });

    const result = await service.checkAndGrantAchievement(userId, achievementId);

    expect(prisma.userAchievement.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { xp: { increment: 20 } },
    });
    expect(result.id).toBe(achievementId);
  });

  it('should not grant achievement if already earned', async () => {
    const userId = 1;
    const achievementId = 'first_tier_list' as any;

    (prisma.userAchievement.findUnique as any).mockResolvedValue({ id: 123 });

    const result = await service.checkAndGrantAchievement(userId, achievementId);

    expect(prisma.userAchievement.create).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should return correct title based on XP', () => {
    expect(service.getTitleByXP(0)).toBe('Новичок');
    expect(service.getTitleByXP(20)).toBe('Мастер');
    expect(service.getTitleByXP(100)).toBe('Книжный червь');
    expect(service.getTitleByXP(1000)).toBe('Легенда библиотек');
  });
});
