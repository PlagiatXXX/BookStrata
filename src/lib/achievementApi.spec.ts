import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiGetUserAchievements, checkResponseForAchievements } from "./achievementApi";

const { triggerAchievementNotification, apiClientGet } = vi.hoisted(() => ({
  triggerAchievementNotification: vi.fn(),
  apiClientGet: vi.fn(),
}));

vi.mock("@/hooks/useAchievementNotifications", () => ({
  triggerAchievementNotification,
}));

vi.mock("./api-client", () => ({
  apiClient: { get: apiClientGet },
}));

describe("checkResponseForAchievements", () => {
  beforeEach(() => {
    triggerAchievementNotification.mockClear();
  });

  it("triggers notifications for root-level achievements", () => {
    const achievement = { id: "first_tier_list", title: "First" };

    checkResponseForAchievements({ newAchievements: [achievement] });

    expect(triggerAchievementNotification).toHaveBeenCalledWith(achievement);
  });

  it("triggers notifications for wrapped achievements payloads", () => {
    const achievement = { id: "critic", title: "Critic" };

    checkResponseForAchievements({
      data: { newAchievements: [achievement] },
    });

    expect(triggerAchievementNotification).toHaveBeenCalledWith(achievement);
  });

  it("ignores responses without achievements", () => {
    checkResponseForAchievements({ data: {} });

    expect(triggerAchievementNotification).not.toHaveBeenCalled();
  });
});

describe("apiGetUserAchievements", () => {
  beforeEach(() => {
    triggerAchievementNotification.mockClear();
    apiClientGet.mockReset();
  });

  it("запрашивает GET /users/:id/achievements и возвращает список", async () => {
    const mockAchievements = [
      {
        id: "bookworm_1",
        title: "Первая полка",
        description: "Создайте первый тир-лист",
        iconUrl: "/icons/bookworm.svg",
        xpValue: 50,
        earnedAt: "2026-11-01T12:00:00.000Z",
      },
      {
        id: "critic",
        title: "Критик",
        description: "Оставьте мысли о книгах",
        iconUrl: null,
        xpValue: 100,
        earnedAt: "2026-11-10T08:30:00.000Z",
      },
    ];
    apiClientGet.mockResolvedValue(mockAchievements);

    const result = await apiGetUserAchievements("42");

    expect(apiClientGet).toHaveBeenCalledWith("/users/42/achievements");
    expect(result).toEqual(mockAchievements);
    expect(result[0].earnedAt).toBe("2026-11-01T12:00:00.000Z");
    expect(result[1].iconUrl).toBeNull();
  });

  it("возвращает пустой массив, если достижений нет", async () => {
    apiClientGet.mockResolvedValue([]);

    const result = await apiGetUserAchievements("42");

    expect(apiClientGet).toHaveBeenCalledWith("/users/42/achievements");
    expect(result).toEqual([]);
  });
});
