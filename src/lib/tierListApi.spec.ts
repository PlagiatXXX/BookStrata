import { describe, it, expect } from "vitest";
import { transformApiToState } from "./tierListApi";
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
