import { afterEach, describe, expect, it, vi } from "vitest";
// Изолируем тест от окружения: VITE_API_URL на разных машинах разный
// (пустой/не задан), а тест проверяет перезапрос по финальному пути.
vi.mock("./config", () => ({ API_BASE_URL: "/api" }));
import { apiClient } from "./api-client";

/**
 * Баг: бэкенд отдаёт 301-редирект (uuid → slug) на фронтовый путь
 * /tier-lists/<slug>. fetch прозрачно следует за ним и получает SPA-страницу
 * (index.html) вместо JSON. Раньше apiClient возвращал undefined, и код ниже
 * падал с "Cannot read properties of undefined (reading 'tiers')".
 * Фикс: при 200-ответе с HTML-контентом повторяем GET по финальному пути
 * через /api — там уже JSON.
 */
describe("apiClient: HTML-фолбэк после 301-редиректа", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("перезапрашивает финальный путь через /api, если пришла SPA-страница", async () => {
    const fetchMock = vi
      .fn()
      // Первый запрос: fetch прошёл по 301-редиректу и получил index.html
      .mockImplementationOnce(async () => {
        const htmlResponse = new Response("<!DOCTYPE html><html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
        // response.url в реальном fetch — финальный URL после редиректов
        Object.defineProperty(htmlResponse, "url", {
          value: "http://localhost:5173/tier-lists/my-slug",
        });
        return htmlResponse;
      })
      // Повторный запрос: /api/tier-lists/my-slug — уже JSON
      .mockImplementationOnce(
        () =>
          new Response(
            JSON.stringify({ data: { id: "list-1", title: "Мой список" } }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.get<{ id: string; title: string }>(
      "/tier-lists/list-uuid",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe("/api/tier-lists/my-slug");
    expect(result).toEqual({ id: "list-1", title: "Мой список" });
  });

  it("не перезапрашивает GET, если финальный путь уже API-шный", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        const htmlResponse = new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
        Object.defineProperty(htmlResponse, "url", {
          value: "http://localhost:5173/api/tier-lists/my-slug",
        });
        return htmlResponse;
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.get<{ id: string }>("/tier-lists/list-uuid");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it("при статусе 499 не вызывает notifyError и выбрасывает ошибку client_closed", async () => {
    const notifyErrorModule = await import("./notifyError");
    const spy = vi.spyOn(notifyErrorModule, "notifyError");

    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      return new Response("Client Closed Request", {
        status: 499,
        statusText: "Client Closed Request",
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/test")).rejects.toMatchObject({
      code: "client_closed",
      status: 499,
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("переводит ошибку ACCESS_DENIED и 403 в понятный русский текст", async () => {
    const notifyErrorModule = await import("./notifyError");
    const spy = vi.spyOn(notifyErrorModule, "notifyError");

    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "ACCESS_DENIED", message: "Access denied" },
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/tier-lists/private")).rejects.toMatchObject({
      code: "ACCESS_DENIED",
      status: 403,
      message: "Доступ ограничен автором. Этот материал является приватным",
    });

    expect(spy).toHaveBeenCalledWith(
      "Ошибка",
      "Доступ ограничен автором. Этот материал является приватным",
    );
    spy.mockRestore();
  });

  it("сохраняет исходное понятное сообщение на русском языке", async () => {
    const notifyErrorModule = await import("./notifyError");
    const spy = vi.spyOn(notifyErrorModule, "notifyError");

    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "CUSTOM_ERROR", message: "Вы уже оценили эту книгу" },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.post("/books/rate")).rejects.toMatchObject({
      code: "CUSTOM_ERROR",
      status: 400,
      message: "Вы уже оценили эту книгу",
    });

    expect(spy).toHaveBeenCalledWith("Ошибка", "Вы уже оценили эту книгу");
    spy.mockRestore();
  });

  it("переводит 500 ошибку сервера в дружелюбное сообщение в тосте", async () => {
    const notifyErrorModule = await import("./notifyError");
    const spy = vi.spyOn(notifyErrorModule, "notifyError");

    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Database connection failed" },
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/server-error")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
    });

    expect(spy).toHaveBeenCalledWith(
      "Ошибка",
      "Сервер временно недоступен. Попробуйте обновить страницу позже",
    );
    spy.mockRestore();
  });
});