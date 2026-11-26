import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  apiTrackEvent,
  flushAnalyticsQueue,
  _resetAnalyticsQueueForTests,
} from "./analyticsApi";

describe("analyticsApi", () => {
  const originalLocation = window.location;
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

  beforeEach(() => {
    vi.clearAllMocks();
    _resetAnalyticsQueueForTests();
    localStorage.clear();
    delete (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__;
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  describe("apiTrackEvent", () => {
    it("подставляет window.location и контекст сессии, отправляет через /analytics/batch", async () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          hostname: "bookstrata.ru",
          pathname: "/tier-lists/school-books",
          search: "?mode=edit",
        },
      });

      await apiTrackEvent("page_view");
      await flushAnalyticsQueue();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/analytics/batch");
      expect(options.keepalive).toBe(true);
      const parsed = JSON.parse(options.body);
      expect(parsed.events[0]).toMatchObject({
        event: "page_view",
        url: "/tier-lists/school-books?mode=edit",
      });
      expect(parsed.events[0].anonymousId).toBeTruthy();
      expect(parsed.events[0].sessionId).toBeTruthy();
    });

    it("использует переданный явно url в приоритете", async () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          hostname: "bookstrata.ru",
          pathname: "/other-page",
          search: "",
        },
      });

      await apiTrackEvent("page_view", { ref: "direct" }, "/custom-url");
      await flushAnalyticsQueue();

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
      expect(body.events[0]).toMatchObject({
        event: "page_view",
        meta: { ref: "direct" },
        url: "/custom-url",
      });
    });

    it("не отправляет запрос если активен prerender", async () => {
      (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__ = true;

      await apiTrackEvent("page_view");
      await flushAnalyticsQueue();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("не отправляет запрос если браузер автоматизирован (navigator.webdriver === true)", async () => {
      Object.defineProperty(navigator, "webdriver", {
        configurable: true,
        value: true,
      });

      try {
        await apiTrackEvent("page_view");
        await flushAnalyticsQueue();
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, "webdriver", {
          configurable: true,
          value: false,
        });
      }
    });

    it("не отправляет session_heartbeat (перенесён в presence)", async () => {
      await apiTrackEvent("session_heartbeat");
      await flushAnalyticsQueue();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("не выбрасывает исключение при сетевой ошибке fetch", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network failed"));

      await apiTrackEvent("test_event");
      await expect(flushAnalyticsQueue()).resolves.toBeUndefined();
    });

    it("автоматически сбрасывает батч при накоплении 10 событий", async () => {
      for (let i = 0; i < 10; i++) {
        await apiTrackEvent("book_placed", { index: i });
      }
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
      expect(body.events).toHaveLength(10);
    });
  });
});
