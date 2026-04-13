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

  it('should fetch all achievements with user status in one query', async () => {
    const userId = 1;
    const mockAchievements = [
      {
        id: 'a1',
        title: 'Title 1',
        description: 'Desc 1',
        isSecret: false,
        xpValue: 10,
        users: [{ earnedAt: new Date() }]
      },
      {
        id: 'a2',
        title: 'Secret',
        description: 'Secret Desc',
        isSecret: true,
        xpValue: 20,
        users: []
      }
    ];

    (prisma.achievement.findMany as any).mockResolvedValue(mockAchievements);

    const result = await service.getUserAchievements(userId);

    expect(prisma.achievement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: {
        users: {
          where: { userId },
          select: { earnedAt: true }
        }
      }
    }));

    expect(result[0].isEarned).toBe(true);
    expect(result[1].isEarned).toBe(false);
    expect(result[1].title).toBe('Секретное достижение');
    expect(result[1].description).toBe('???');
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
