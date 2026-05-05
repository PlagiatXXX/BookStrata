import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.GOOGLE_BOOKS_API_KEY = "test-google-books-api-key";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("../../lib/cache.js", () => ({
  getFromCache: vi.fn(),
  setToCache: vi.fn(),
}));

import * as booksService from "./books.service.js";
import { getFromCache, setToCache } from "../../lib/cache.js";

describe("books.service query normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFromCache as any).mockResolvedValue(null);
    (setToCache as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("trims whitespace before building the Google Books query", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ items: [] }),
    });

    await booksService.searchBooks("  Harry Potter  ");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("q=intitle%3AHarry+Potter"),
    );
  });
});
