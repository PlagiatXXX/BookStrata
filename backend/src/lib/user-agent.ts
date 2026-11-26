export type DeviceType = "mobile" | "tablet" | "desktop";

export interface ParsedUserAgent {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
}

const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|headless|meta-externalagent|preview|monitor|scrapy|phantomjs|python-requests|wget|curl\/|go-http-client|okhttp|axios|node-fetch/i;

/** true, если userAgent выглядит как бот/краулер/скрипт. Пустой UA (тесты, серверные вызовы) — не бот. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

const BROWSER_MATCHERS: ReadonlyArray<[RegExp, string]> = [
  [/YaBrowser\//i, "Яндекс.Браузер"],
  [/Edg(?:A|iOS)?\//i, "Edge"],
  [/OPR\/|Opera\//i, "Opera"],
  [/SamsungBrowser\//i, "Samsung Internet"],
  [/Firefox\/|FxiOS\//i, "Firefox"],
  [/Chrome\/|CriOS\//i, "Chrome"],
  [/Safari\//i, "Safari"],
];

const OS_MATCHERS: ReadonlyArray<[RegExp, string]> = [
  [/iPhone|iPad|iPod/i, "iOS"],
  [/Android/i, "Android"],
  [/Windows/i, "Windows"],
  [/Mac OS X|Macintosh/i, "macOS"],
  [/Linux/i, "Linux"],
];

function detectDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet|Kindle|PlayBook/i.test(ua)) {
    return "tablet";
  }
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|iPhone|iPod|Windows Phone|BlackBerry/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

function matchFirst(ua: string, table: ReadonlyArray<[RegExp, string]>): string | null {
  for (const [pattern, name] of table) {
    if (pattern.test(ua)) return name;
  }
  return null;
}

/** Лёгкий парсер User-Agent без внешних зависимостей. */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) {
    return { deviceType: "desktop", browser: null, os: null };
  }

  return {
    deviceType: detectDeviceType(userAgent),
    browser: matchFirst(userAgent, BROWSER_MATCHERS),
    os: matchFirst(userAgent, OS_MATCHERS),
  };
}
