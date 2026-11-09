import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { initYandexMetrika, getYmCounterId, reachYmGoal, DEFAULT_YM_COUNTER_ID } from "./ym";

/**
 * Счётчик Метрики должен инициализироваться ТОЛЬКО на продовых хостах.
 * Локальные превью (localhost, 127.0.0.1, vite preview) стреляли в продовый
 * счётчик и портили статистику (491 фейковая сессия за лето 2026).
 */

const COUNTER_ID_ENV = import.meta.env;

function setHostname(host: string) {
  window.location.assign(`https://${host}/`);
}

function injectedScripts(): number {
  return document.querySelectorAll('script[src*="mc.yandex.ru"]').length;
}

describe("initYandexMetrika", () => {
  beforeEach(() => {
    // лоадер вставляет свой тег перед первым <script> — нужен якорь
    document.head.innerHTML = "<script></script>";
    // счётчик задан как в продовой сборке
    (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID = "109755750";
    delete window.__PRERENDER__;
  });

  afterEach(() => {
    delete (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID;
  });

  it("не инициализирует счётчик без VITE_YM_COUNTER_ID", () => {
    delete (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID;
    setHostname("bookstrata.ru");

    initYandexMetrika();

    expect(injectedScripts()).toBe(0);
  });

  it("не инициализирует счётчик в режиме prerender", () => {
    window.__PRERENDER__ = true;
    setHostname("bookstrata.ru");

    initYandexMetrika();

    expect(injectedScripts()).toBe(0);
  });

  it("НЕ инициализирует счётчик на localhost", () => {
    setHostname("localhost");

    initYandexMetrika();

    expect(injectedScripts()).toBe(0);
  });

  it("НЕ инициализирует счётчик на 127.0.0.1", () => {
    setHostname("127.0.0.1");

    initYandexMetrika();

    expect(injectedScripts()).toBe(0);
  });

  it("инициализирует счётчик на bookstrata.ru", () => {
    setHostname("bookstrata.ru");

    initYandexMetrika();

    expect(injectedScripts()).toBe(1);
  });

  it("инициализирует счётчик на www.bookstrata.ru", () => {
    setHostname("www.bookstrata.ru");

    initYandexMetrika();

    expect(injectedScripts()).toBe(1);
  });
});

describe("getYmCounterId & reachYmGoal", () => {
  afterEach(() => {
    delete (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID;
    delete window.ym;
  });

  it("возвращает VITE_YM_COUNTER_ID если задан", () => {
    (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID = "99988877";
    expect(getYmCounterId()).toBe(99988877);
  });

  it("возвращает DEFAULT_YM_COUNTER_ID если VITE_YM_COUNTER_ID не задан", () => {
    delete (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID;
    expect(getYmCounterId()).toBe(DEFAULT_YM_COUNTER_ID);
  });

  it("вызывает window.ym с правильным counterId и goalId", () => {
    const ymSpy = vi.fn();
    window.ym = ymSpy;
    (COUNTER_ID_ENV as Record<string, unknown>).VITE_YM_COUNTER_ID = "55544433";

    reachYmGoal(123456);

    expect(ymSpy).toHaveBeenCalledWith(55544433, "reachGoal", 123456);
  });

  it("не бросает ошибку если window.ym не определен", () => {
    delete window.ym;
    expect(() => reachYmGoal(123456)).not.toThrow();
  });
});
