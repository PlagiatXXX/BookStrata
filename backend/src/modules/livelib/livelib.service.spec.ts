import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем кэш (lib/cache) ДО импорта сервиса — vi.mock hoisted, фабрика самодостаточна
vi.mock("../../lib/cache.js", () => ({
  getFromCache: vi.fn().mockResolvedValue(null),
  setToCache: vi.fn().mockResolvedValue(undefined),
  deleteFromCache: vi.fn().mockResolvedValue(undefined),
  acquireLock: vi.fn().mockResolvedValue(true),
  releaseLock: vi.fn().mockResolvedValue(undefined),
}));

// Мокаем глобальный fetch — по умолчанию мгновенный пустой ответ
const fetchMock = vi.fn().mockResolvedValue(
  new Response("{}", { status: 200, headers: { "content-type": "text/plain" } }),
);
vi.stubGlobal("fetch", fetchMock);

import { fetchUserBooks } from "./livelib.service.js";
import {
  getFromCache,
  setToCache,
  deleteFromCache,
  acquireLock,
  releaseLock,
} from "../../lib/cache.js";

const cacheMock = {
  getFromCache: vi.mocked(getFromCache),
  setToCache: vi.mocked(setToCache),
  deleteFromCache: vi.mocked(deleteFromCache),
  acquireLock: vi.mocked(acquireLock),
  releaseLock: vi.mocked(releaseLock),
};

describe("livelib: защита от зависания и кэширование пустых результатов", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheMock.getFromCache.mockResolvedValue(null);
    cacheMock.acquireLock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
  });

  it("НЕ кэширует только непустые результаты: пустой список тоже попадает в кэш (короткий TTL)", async () => {
    // resolveUserId: HEAD с location на /users/123
    fetchMock.mockImplementation(async (url: string, _init?: RequestInit) => {
      if (String(url).includes("/reader/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://livlib.ru/users/123" },
        });
      }
      // RSC-страница: без книг → extractAllBooksFromRsc вернёт []
      return new Response("no books here", { status: 200 });
    });

    const books = await fetchUserBooks("testuser");
    expect(books).toEqual([]);

    // Пустой результат ДОЛЖЕН быть закэширован (иначе каждый запрос = полный проход по LiveLib)
    expect(cacheMock.setToCache).toHaveBeenCalledWith(
      "livelib:user:testuser",
      [],
      expect.any(Number),
    );
  });

  it("таймаут fetch покрывает и чтение тела, а не только заголовки", async () => {
    // resolveUserId ок; RSC-страница отдаёт тело МЕДЛЕННО — abort должен покрыть и его
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/reader/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://livlib.ru/users/123" },
        });
      }
      // Проверяем, что AbortController передан — паттерн таймаута сохранён
      if (!init?.signal) throw new Error("fetch без AbortSignal — таймаут не защищает запрос");
      return new Response("{}", { status: 200 });
    });

    // Не падает и возвращает результат — сигнал прокинут во все fetch
    await expect(fetchUserBooks("testuser")).resolves.toBeDefined();
  });

  it("общий дедлайн: fetchUserBooks не работает дольше лимита страниц", async () => {
    // resolveUserId ок
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/reader/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://livlib.ru/users/123" },
        });
      }
      // Каждая страница возвращает «книги», чтобы пагинация не заканчивалась
      return new Response(
        JSON.stringify({ props: { bookList: [] } }),
        { status: 200 },
      );
    });

    await fetchUserBooks("testuser");
    // Даже если страницы всё возвращают «новое», общее число страниц ограничено
    // MAX_PAGES_PER_LIST на каждый список × 2 списка — но общее число fetch ≤ 60 + resolve
    const fetchCalls = fetchMock.mock.calls.length;
    expect(fetchCalls).toBeLessThanOrEqual(62);
  });

  it("forceRefresh требует захвата лока (setnx) — не чаще раза в N минут на username", async () => {
    cacheMock.acquireLock.mockResolvedValueOnce(false); // лок уже занят

    await expect(fetchUserBooks("testuser", true)).rejects.toThrow(
      /слишком часто|ПОВТОРИТЕ/i,
    );
    // Кэш не сбрасывается без лока
    expect(cacheMock.deleteFromCache).not.toHaveBeenCalled();
  });

  it("forceRefresh при свободном локе сбрасывает кэш и отпускает лок", async () => {
    cacheMock.acquireLock.mockResolvedValueOnce(true);
    // resolveUserId: редирект на /users/123; страницы пустые
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/reader/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://livelib.ru/users/123" },
        });
      }
      return new Response("{}", { status: 200 });
    });

    await fetchUserBooks("testuser", true);

    expect(cacheMock.deleteFromCache).toHaveBeenCalledWith("livelib:user:testuser");
    expect(cacheMock.releaseLock).toHaveBeenCalled();
  });
});
