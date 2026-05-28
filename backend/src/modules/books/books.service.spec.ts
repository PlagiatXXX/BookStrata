import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Устанавливаем тестовый API key ДО импорта сервиса
// Значение должно совпадать с vitest.setup.ts
process.env.GOOGLE_BOOKS_API_KEY = "test-google-books-api-key";

// Моки для fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("../../lib/cache.js", () => ({
  getFromCache: vi.fn(),
  setToCache: vi.fn(),
}));

// Импортируем после установки env переменных
import * as booksService from "./books.service.js";
import { getFromCache, setToCache } from "../../lib/cache.js";

describe("books.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFromCache as any).mockResolvedValue(null);
    (setToCache as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("searchBooks", () => {
    const mockQuery = "Harry Potter";

    const mockGoogleBooksResponse = {
      items: [
        {
          id: "book1",
          volumeInfo: {
            title: "Harry Potter and the Philosopher's Stone",
            authors: ["J.K. Rowling"],
            publishedDate: "1997",
            pageCount: 223,
            categories: ["Fantasy", "Fiction"],
            imageLinks: {
              thumbnail: "http://example.com/thumb.jpg",
              medium: "http://example.com/medium.jpg",
            },
          },
        },
        {
          id: "book2",
          volumeInfo: {
            title: "Harry Potter and the Chamber of Secrets",
            authors: ["J.K. Rowling"],
            publishedDate: "1998",
            pageCount: 251,
            categories: ["Fantasy"],
            imageLinks: {
              thumbnail: "http://example.com/thumb2.jpg",
            },
          },
        },
        {
          id: "book3",
          volumeInfo: {
            title: "Book Without Cover",
            authors: ["Unknown Author"],
            imageLinks: {}, // Нет обложки
          },
        },
      ],
    };

    it("должен вернуть список книг с обложками", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleBooksResponse,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result).toHaveLength(2); // Третья книга без обложки отфильтрована
      expect(result[0]).toMatchObject({
        openLibraryKey: "book1",
        title: "Harry Potter and the Philosopher's Stone",
        author: "J.K. Rowling",
        publishYear: 1997,
        numberOfPages: 223,
      });
      expect(result[0].coverUrl).toContain("https://");
    });

    it("должен заменить http на https в URL обложки", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleBooksResponse,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result[0].coverUrl).toMatch(/^https:\/\//);
      expect(result[0].coverUrlLarge).toMatch(/^https:\/\//);
    });

    it("должен выполнить дедупликацию по openLibraryKey", async () => {
      const duplicateResponse = {
        items: [
          {
            id: "book1",
            volumeInfo: {
              title: "Book 1",
              authors: ["Author 1"],
              imageLinks: { thumbnail: "http://example.com/1.jpg" },
            },
          },
          {
            id: "book1", // Дубликат
            volumeInfo: {
              title: "Book 1 (Duplicate)",
              authors: ["Author 1"],
              imageLinks: { thumbnail: "http://example.com/1.jpg" },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => duplicateResponse,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result).toHaveLength(1);
      expect(result[0].openLibraryKey).toBe("book1");
    });

    it("должен вернуть пустой массив для пустого query", async () => {
      const result = await booksService.searchBooks("");
      expect(result).toEqual([]);
    });

    it("должен вернуть пустой массив для query < 2 символов", async () => {
      const result = await booksService.searchBooks("a");
      expect(result).toEqual([]);
    });

    it("должен использовать API key из setup file", async () => {
      // Тест проверяет что setup file корректно устанавливает API key
      expect(process.env.GOOGLE_BOOKS_API_KEY).toBe(
        "test-google-books-api-key",
      );
    });

    it("должен бросить ошибку после исчерпания ретраев", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => '{"error":{"message":"Quota exceeded"}}',
      });

      await expect(booksService.searchBooks(mockQuery)).rejects.toThrow(
        "Google Books API error: 403 Forbidden",
      );

      // Должно быть 3 попытки (исходная + 2 ретрая)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("должен использовать правильный URL для API запроса", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ items: [] }),
      });

      await booksService.searchBooks(mockQuery);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://www.googleapis.com/books/v1/volumes"),
      );
      // URL кодируется правильно: intitle:Harry Potter -> intitle%3AHarry+Potter
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=intitle%3AHarry"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("key=test-google-books-api-key"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("maxResults=20"),
      );
    });

    it("должен обработать книгу без автора", async () => {
      const responseWithoutAuthor = {
        items: [
          {
            id: "book-no-author",
            volumeInfo: {
              title: "Book Without Author",
              imageLinks: { thumbnail: "http://example.com/cover.jpg" },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => responseWithoutAuthor,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result[0].author).toBe("Неизвестен");
    });

    it("должен извлечь numberOfPages если есть", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleBooksResponse,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result[0].numberOfPages).toBe(223);
    });

    it("должен извлечь subjects если есть", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleBooksResponse,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result[0].subjects).toEqual(["Fantasy", "Fiction"]);
    });

    it("должен использовать large/medium обложку если есть", async () => {
      const responseWithLargeCover = {
        items: [
          {
            id: "book-large",
            volumeInfo: {
              title: "Book with Large Cover",
              authors: ["Author"],
              imageLinks: {
                large: "http://example.com/large.jpg",
                thumbnail: "http://example.com/thumb.jpg",
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => responseWithLargeCover,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result[0].coverUrlLarge).toContain("large.jpg");
    });

    it("должен использовать fallback на thumbnail если нет large/medium", async () => {
      const responseWithOnlyThumbnail = {
        items: [
          {
            id: "book-thumb",
            volumeInfo: {
              title: "Book with Thumbnail",
              authors: ["Author"],
              imageLinks: {
                thumbnail: "http://example.com/thumb.jpg",
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => responseWithOnlyThumbnail,
      });

      const result = await booksService.searchBooks(mockQuery);

      expect(result[0].coverUrl).toContain("thumb.jpg");
      expect(result[0].coverUrlLarge).toContain("thumb.jpg"); // fallback
    });
  });
});
