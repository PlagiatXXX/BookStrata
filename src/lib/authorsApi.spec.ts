import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAuthorBySlug } from "./authorsApi";
import { apiClient } from "./api-client";

vi.mock("./api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

describe("getAuthorBySlug", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("вызывает GET /authors/{slug} и возвращает данные страницы", async () => {
    const payload = {
      author: { id: 1, name: "Пушкин", slug: "pushkin", seoDescription: "Текст", bookCount: 5, avgRating: 9 },
      books: [],
      topBooks: [],
      bottomBooks: [],
      tierLists: [],
    };
    vi.mocked(apiClient.get).mockResolvedValue(payload as never);

    const result = await getAuthorBySlug("pushkin");

    expect(apiClient.get).toHaveBeenCalledWith("/authors/pushkin");
    expect(result).toBe(payload);
  });

  it("экранирует slug в URL", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({} as never);

    await getAuthorBySlug("a b/c");

    expect(apiClient.get).toHaveBeenCalledWith("/authors/a%20b%2Fc");
  });
});
