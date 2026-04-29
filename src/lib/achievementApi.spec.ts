import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkResponseForAchievements } from "./achievementApi";

const { triggerAchievementNotification } = vi.hoisted(() => ({
  triggerAchievementNotification: vi.fn(),
}));

vi.mock("@/hooks/useAchievementNotifications", () => ({
  triggerAchievementNotification,
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
