// src/lib/newsApi.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./api-client", () => ({
  api: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ApiRequestError: class extends Error {},
}));

import { uploadNewsImage } from "./newsApi";

describe("uploadNewsImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("постит base64 на /news/upload-image и возвращает URL", async () => {
    const { api } = await import("./api-client");
    vi.mocked(api.post).mockResolvedValue({
      data: { imageUrl: "https://cdn.example.com/news/1.webp" },
    });

    const result = await uploadNewsImage("data:image/png;base64,AAA");

    expect(api.post).toHaveBeenCalledWith("/news/upload-image", {
      imageUrl: "data:image/png;base64,AAA",
    });
    expect(result).toEqual({ imageUrl: "https://cdn.example.com/news/1.webp" });
  });
});
