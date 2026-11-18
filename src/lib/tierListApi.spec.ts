import { describe, it, expect, vi } from "vitest";
import {
  transformApiToState,
  isSeasonalTheme,
  isAdminOnlyTheme,
  resolveDisplayTheme,
  ADMIN_ONLY_THEMES,
  SEASONAL_THEMES,
  THEME_LABELS,
  THEME_COLORS,
  normalizeTheme,
  createTierList,
} from "./tierListApi";
import { apiClient } from "./api-client";
import type { ApiTierListResponse } from "@/types/api";

const baseResponse: ApiTierListResponse = {
  id: "list-1",
  slug: "my-list",
  title: "Мой список",
  year: null,
  isPublic: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  user: { id: 1, username: "user" },
  tiers: [
    {
      id: 1,
      title: "S",
      color: "#ff8000",
      rank: 0,
      items: [
        {
          rank: 0,
          book: {
            id: 10,
            title: "Анна Каренина",
            author: "Лев Толстой",
            coverImageUrl: "/cover.jpg",
            description: "Роман",
            thoughts: null,
            createdAt: "2026-01-01T00:00:00Z",
            slug: "anna-karenina",
            status: "published",
          },
        },
      ],
    },
  ],
  unrankedBooks: [],
};

describe("transformApiToState — проброс каталога (Фаза 5.3)", () => {
  it("сохраняет slug и status книги для ссылок на /books/{slug}", () => {
    const state = transformApiToState(baseResponse);

    expect(state.books["10"]).toMatchObject({
      slug: "anna-karenina",
      status: "published",
    });
  });

  it("не ломается, если slug/status отсутствуют (старые данные)", () => {
    const response: ApiTierListResponse = {
      ...baseResponse,
      tiers: [
        {
          ...baseResponse.tiers![0],
          items: [
            {
              rank: 0,
              book: {
                id: 11,
                title: "Старая книга",
                author: "Автор",
                coverImageUrl: "",
                description: null,
                thoughts: null,
                createdAt: "2026-01-01T00:00:00Z",
              },
            },
          ],
        },
      ],
    };

    const state = transformApiToState(response);

    expect(state.books["11"].slug).toBeUndefined();
    expect(state.books["11"].status).toBeUndefined();
  });
});

describe("tierListApi seasonal themes", () => {
  it("correctly identifies seasonal themes", () => {
    expect(isSeasonalTheme("autumn-leaves")).toBe(true);
    expect(isSeasonalTheme("autumn-rain")).toBe(true);
    expect(isSeasonalTheme("winter-frost")).toBe(true);
    expect(isSeasonalTheme("winter-aurora")).toBe(true);
    expect(isSeasonalTheme("winter-newyear")).toBe(true);
    expect(isSeasonalTheme("default")).toBe(false);
    expect(isSeasonalTheme("pixel")).toBe(false);
    expect(isSeasonalTheme(null)).toBe(false);
    expect(isSeasonalTheme(undefined)).toBe(false);
  });

  it("correctly identifies admin-only locked themes", () => {
    expect(isAdminOnlyTheme("autumn-leaves")).toBe(true);
    expect(isAdminOnlyTheme("winter-newyear")).toBe(true);
    expect(isAdminOnlyTheme("autumn-rain")).toBe(false);
    expect(isAdminOnlyTheme("winter-frost")).toBe(false);
    expect(isAdminOnlyTheme("winter-aurora")).toBe(false);
    expect(isAdminOnlyTheme("default")).toBe(false);
    expect(ADMIN_ONLY_THEMES).toEqual(["autumn-leaves", "winter-newyear"]);
  });

  it("resolveDisplayTheme protects admin themes from non-admin users", () => {
    // Не-админ: подмена на открытые аналоги
    expect(resolveDisplayTheme("autumn-leaves", false)).toBe("autumn-rain");
    expect(resolveDisplayTheme("winter-newyear", false)).toBe("winter-frost");
    expect(resolveDisplayTheme("autumn-rain", false)).toBe("autumn-rain");
    expect(resolveDisplayTheme("winter-frost", false)).toBe("winter-frost");

    // Админ: видит оригинальные темы
    expect(resolveDisplayTheme("autumn-leaves", true)).toBe("autumn-leaves");
    expect(resolveDisplayTheme("winter-newyear", true)).toBe("winter-newyear");
  });

  it("contains labels and colors for all seasonal themes", () => {
    for (const theme of SEASONAL_THEMES) {
      expect(THEME_LABELS[theme]).toBeDefined();
      expect(THEME_COLORS[theme]).toBeDefined();
      expect(THEME_COLORS[theme].bg).toMatch(/^#/);
      expect(normalizeTheme(theme)).toBe(theme);
    }
  });

  it("omits theme from apiClient.post payload when not provided", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ id: "new-id" } as any);
    await createTierList("Заголовок", "Описание");
    expect(postSpy).toHaveBeenCalledWith("/tier-lists", {
      title: "Заголовок",
      description: "Описание",
    });
    postSpy.mockRestore();
  });

  it("passes theme to apiClient.post when provided in createTierList", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ id: "new-id" } as any);
    await createTierList("Заголовок", "Описание", "autumn-leaves");
    expect(postSpy).toHaveBeenCalledWith("/tier-lists", {
      title: "Заголовок",
      description: "Описание",
      theme: "autumn-leaves",
    });
    postSpy.mockRestore();
  });
});

