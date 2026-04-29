import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.GOOGLE_BOOKS_API_KEY = "test-google-books-api-key";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import * as booksService from "./books.service.js";

describe("books.service query normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
