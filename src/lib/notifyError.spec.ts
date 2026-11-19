import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyError } from "./notifyError";
import { sileo } from "sileo";

vi.mock("sileo", () => ({
  sileo: {
    error: vi.fn(),
  },
}));

describe("notifyError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__;
  });

  afterEach(() => {
    delete (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__;
  });

  it("вызывает sileo.error в обычном браузере пользователя", () => {
    notifyError("Ошибка загрузки", "Не удалось загрузить данные");
    expect(sileo.error).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные",
      }),
    );
  });

  it("не показывает тост при пререндеринге (window.__PRERENDER__ === true)", () => {
    (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__ = true;

    notifyError("Ошибка 499", "Client Closed Request");

    expect(sileo.error).not.toHaveBeenCalled();
  });
});
