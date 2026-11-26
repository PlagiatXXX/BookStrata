import { describe, it, expect } from "vitest";
import { isBotUserAgent, parseUserAgent } from "./user-agent.js";

describe("user-agent utilities", () => {
  describe("isBotUserAgent", () => {
    it("распознаёт поисковых и социальных краулеров", () => {
      expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
      expect(isBotUserAgent("YandexBot/3.0")).toBe(true);
      expect(isBotUserAgent("meta-externalagent/1.1")).toBe(true);
      expect(isBotUserAgent("HeadlessChrome/131.0")).toBe(true);
      expect(isBotUserAgent("curl/8.5.0")).toBe(true);
    });

    it("пропускает реальные браузеры и пустой UA", () => {
      expect(isBotUserAgent(null)).toBe(false);
      expect(isBotUserAgent(undefined)).toBe(false);
      expect(
        isBotUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36",
        ),
      ).toBe(false);
    });
  });

  describe("parseUserAgent", () => {
    it("определяет десктопный Chrome на Windows", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
      expect(parseUserAgent(ua)).toEqual({
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
      });
    });

    it("определяет мобильный Safari на iOS", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
      expect(parseUserAgent(ua)).toEqual({
        deviceType: "mobile",
        browser: "Safari",
        os: "iOS",
      });
    });

    it("определяет планшет iPad и Android Tablet", () => {
      const ipadUa =
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
      expect(parseUserAgent(ipadUa).deviceType).toBe("tablet");

      const androidTab =
        "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(androidTab)).toEqual({
        deviceType: "tablet",
        browser: "Chrome",
        os: "Android",
      });
    });

    it("определяет Яндекс.Браузер и Edge корректно (до Chrome)", () => {
      const yaUa =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 YaBrowser/24.10.0.0 Safari/537.36";
      expect(parseUserAgent(yaUa).browser).toBe("Яндекс.Браузер");

      const edgeUa =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";
      expect(parseUserAgent(edgeUa)).toEqual({
        deviceType: "desktop",
        browser: "Edge",
        os: "macOS",
      });
    });

    it("возвращает безопасный fallback при отсутствии UA", () => {
      expect(parseUserAgent(null)).toEqual({
        deviceType: "desktop",
        browser: null,
        os: null,
      });
    });
  });
});
