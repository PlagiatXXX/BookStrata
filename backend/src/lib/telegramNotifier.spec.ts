import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTelegramFeedbackNotification, formatFeedbackHtml } from "./telegramNotifier.js";
import { config } from "../config/env.js";

type ConfigMutable = Record<string, string | undefined>;

describe("telegramNotifier", () => {
  const originalFetch = globalThis.fetch;
  const cfg = config as unknown as ConfigMutable;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("formatFeedbackHtml", () => {
    it("formats feedback message with all fields", () => {
      const html = formatFeedbackHtml({
        username: "testuser",
        userEmail: "test@example.com",
        userId: 42,
        rating: "great",
        message: "Отличный сайт <3 & крутые фичи",
        pageUrl: "/rankings",
      });

      expect(html).toContain("Новый отзыв о BookStrata");
      expect(html).toContain("@testuser");
      expect(html).toContain("test@example.com");
      expect(html).toContain("ID: 42");
      expect(html).toContain("😍 Всё отлично");
      expect(html).toContain("&lt;3 &amp; крутые фичи");
      expect(html).toContain("/rankings");
    });

    it("handles missing optional fields gracefully", () => {
      const html = formatFeedbackHtml({
        rating: "neutral",
      });

      expect(html).toContain("Гость");
      expect(html).toContain("🤔 Есть вопросы / идеи");
      expect(html).toContain("<i>Без комментария</i>");
    });
  });

  describe("sendTelegramFeedbackNotification", () => {
    it("returns false and does not call fetch when credentials are not configured", async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const prevToken = config.TELEGRAM_BOT_TOKEN;
      const prevChatId = config.TELEGRAM_CHAT_ID;
      cfg.TELEGRAM_BOT_TOKEN = "";
      cfg.TELEGRAM_CHAT_ID = "";

      const result = await sendTelegramFeedbackNotification({
        rating: "great",
        message: "Тест",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();

      cfg.TELEGRAM_BOT_TOKEN = prevToken;
      cfg.TELEGRAM_CHAT_ID = prevChatId;
    });

    it("sends request to Telegram Bot API when credentials are set", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const prevToken = config.TELEGRAM_BOT_TOKEN;
      const prevChatId = config.TELEGRAM_CHAT_ID;
      cfg.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      cfg.TELEGRAM_CHAT_ID = "998877";

      const result = await sendTelegramFeedbackNotification({
        username: "booklover",
        rating: "great",
        message: "Супер!",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("998877"),
        })
      );

      cfg.TELEGRAM_BOT_TOKEN = prevToken;
      cfg.TELEGRAM_CHAT_ID = prevChatId;
    });

    it("catches fetch errors and returns false without throwing", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const prevToken = config.TELEGRAM_BOT_TOKEN;
      const prevChatId = config.TELEGRAM_CHAT_ID;
      cfg.TELEGRAM_BOT_TOKEN = "token";
      cfg.TELEGRAM_CHAT_ID = "123";

      const result = await sendTelegramFeedbackNotification({
        rating: "bad",
      });

      expect(result).toBe(false);

      cfg.TELEGRAM_BOT_TOKEN = prevToken;
      cfg.TELEGRAM_CHAT_ID = prevChatId;
    });
  });
});
