import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiTrackEvent } from "./analyticsApi";
import { apiClient } from "./api-client";

vi.mock("./api-client", () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

describe("analyticsApi", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).__PRERENDER__;
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  describe("apiTrackEvent", () => {
    it("подставляет window.location если url не передан явно", async () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          pathname: "/tier-lists/school-books",
          search: "?mode=edit",
        },
      });

      await apiTrackEvent("session_heartbeat");

      expect(apiClient.post).toHaveBeenCalledWith("/analytics/track", {
        event: "session_heartbeat",
        meta: undefined,
        url: "/tier-lists/school-books?mode=edit",
      });
    });

    it("использует переданный явно url в приоритете", async () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          pathname: "/other-page",
          search: "",
        },
      });

      await apiTrackEvent("page_view", { ref: "direct" }, "/custom-url");

      expect(apiClient.post).toHaveBeenCalledWith("/analytics/track", {
        event: "page_view",
        meta: { ref: "direct" },
        url: "/custom-url",
      });
    });

    it("не отправляет запрос если активен prerender", async () => {
      (window as any).__PRERENDER__ = true;

      await apiTrackEvent("page_view");

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("не выбрасывает исключение при ошибке apiClient", async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("Network failed"));

      await expect(apiTrackEvent("test_event")).resolves.toBeUndefined();
    });
  });
});
