import { afterEach, describe, expect, it, vi } from "vitest";
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
});