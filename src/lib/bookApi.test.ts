// src/lib/bookApi.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api-client";
import {
  addBookToTierList,
  createBookComment,
  deleteBookComment,
  getBook,
  getBookComments,
  toggleBookCommentLike,
  toggleBookLike,
  updateBookComment,
} from "./bookApi";
import { ApiRequestError } from "./api-client";

vi.mock("./api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api-client")>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPatch = vi.mocked(apiClient.patch);
const mockedDelete = vi.mocked(apiClient.delete);

describe("bookApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBook", () => {
    it("возвращает данные страницы книги", async () => {
      const pageData = { book: { id: 1, title: "Война и мир" } };
      mockedGet.mockResolvedValue(pageData);
      await expect(getBook("vojna-i-mir")).resolves.toEqual(pageData);
      expect(mockedGet).toHaveBeenCalledWith("/books/vojna-i-mir");
    });

    it("возвращает null при 404 (draft/не существует)", async () => {
      mockedGet.mockRejectedValue(new ApiRequestError("not_found", "Книга не найдена", 404));
      await expect(getBook("nety")).resolves.toBeNull();
    });

    it("пробрасывает прочие ошибки", async () => {
      mockedGet.mockRejectedValue(new ApiRequestError("internal", "Ошибка", 500));
      await expect(getBook("boom")).rejects.toThrow("Ошибка");
    });
  });

  describe("getBookComments", () => {
    it("передаёт offset/limit в query-параметры", async () => {
      mockedGet.mockResolvedValue({ items: [], total: 0 });
      await getBookComments("slug", 20, 10);
      expect(mockedGet).toHaveBeenCalledWith("/books/slug/comments", { offset: 20, limit: 10 });
    });
  });

  describe("createBookComment", () => {
    it("передаёт content и parentId", async () => {
      mockedPost.mockResolvedValue({ comment: { id: 1 } });
      await createBookComment("slug", "Отличная книга", 42);
      expect(mockedPost).toHaveBeenCalledWith("/books/slug/comments", {
        content: "Отличная книга",
        parentId: 42,
      });
    });

    it("не передаёт parentId, если он не указан", async () => {
      mockedPost.mockResolvedValue({ comment: { id: 1 } });
      await createBookComment("slug", "Отличная книга");
      expect(mockedPost).toHaveBeenCalledWith("/books/slug/comments", {
        content: "Отличная книга",
      });
    });
  });

  it("updateBookComment — PATCH с content", async () => {
    mockedPatch.mockResolvedValue({ comment: { id: 7 } });
    await updateBookComment("slug", 7, "Новый текст");
    expect(mockedPatch).toHaveBeenCalledWith("/books/slug/comments/7", { content: "Новый текст" });
  });

  it("deleteBookComment — DELETE по id", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    await deleteBookComment("slug", 7);
    expect(mockedDelete).toHaveBeenCalledWith("/books/slug/comments/7");
  });

  it("toggleBookCommentLike — POST like", async () => {
    mockedPost.mockResolvedValue({ liked: true, likesCount: 3 });
    await expect(toggleBookCommentLike("slug", 7)).resolves.toEqual({ liked: true, likesCount: 3 });
    expect(mockedPost).toHaveBeenCalledWith("/books/slug/comments/7/like");
  });

  it("toggleBookLike — POST like", async () => {
    mockedPost.mockResolvedValue({ liked: true, likesCount: 5 });
    await expect(toggleBookLike("slug")).resolves.toEqual({ liked: true, likesCount: 5 });
    expect(mockedPost).toHaveBeenCalledWith("/books/slug/like");
  });

  it("addBookToTierList — POST tier-lists с tierListId", async () => {
    mockedPost.mockResolvedValue({ placement: { bookId: "1", tierId: null, rank: 0 } });
    await addBookToTierList("slug", "tl-1");
    expect(mockedPost).toHaveBeenCalledWith("/books/slug/tier-lists", { tierListId: "tl-1" });
  });
});
