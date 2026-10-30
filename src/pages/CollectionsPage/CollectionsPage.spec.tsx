// src/pages/CollectionsPage/CollectionsPage.spec.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CollectionsPage from "./CollectionsPage";

vi.mock("@/lib/collectionsApi", () => ({ getCollections: vi.fn() }));
const seoProps: Record<string, unknown> = {};
vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: (p: Record<string, unknown>) => {
    Object.assign(seoProps, p);
    return null;
  },
}));

import { getCollections } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/types/collection";

const item = (id: number, categoryId?: string | null, title = `Подборка ${id}`): CollectionItem =>
  ({ id, slug: `c-${id}`, title, categoryId, type: "curated", isPublished: true,
     order: id, isFeatured: false, coverImageUrl: `/img/${id}.webp`, tags: [],
     excerpt: `Описание ${id}`, createdAt: "", updatedAt: "" }) as CollectionItem;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><CollectionsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(seoProps).forEach((k) => delete seoProps[k]);
});

describe("CollectionsPage", () => {
  it("имеет хлебные крошки и кнопку «Назад» по паттерну других страниц", async () => {
    vi.mocked(getCollections).mockResolvedValue([]);
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Хлебные крошки" });
    expect(within(nav).getByRole("link", { name: "Главная" })).toHaveProperty(
      "href",
      expect.stringContaining("/"),
    );
    // текущая страница в цепочке — без ссылки
    expect(within(nav).getByText("Подборки книг")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Назад/ })).toBeTruthy();
  });

  it("показывает H1 и плитки разделов-ссылок на топики", async () => {
    vi.mocked(getCollections).mockResolvedValue([
      item(1, "horror", "Топ ужасов"), item(2, "fantasy", "Топ фэнтези"), item(3, null, "Без жанра"),
    ]);
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: /Подборки книг/ })).toBeTruthy();
    // плитки разделов ведут на топики
    const horrorLink = await screen.findByRole("link", { name: /Хоррор и мистика/ });
    expect(horrorLink).toHaveProperty("href", expect.stringContaining("/topics/horror"));
    expect(screen.getByRole("link", { name: /Фэнтези/ })).toHaveProperty("href", expect.stringContaining("/topics/fantasy"));
    // счётчик подборок на плитке (в группах по 1 подборке)
    expect(screen.getAllByText(/1 подборка/)).toHaveLength(2);
    // карточки подборок — только в «Все подборки» (вне жанров); жанровые подборки — контент топиков
    expect(screen.getByRole("link", { name: /Без жанра/ })).toHaveProperty("href", expect.stringContaining("/collections/c-3"));
    expect(screen.queryByRole("link", { name: /Топ ужасов/ })).toBeNull();
    // «Все подборки» и FAQ присутствуют на странице
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain("Все подборки");
    expect(headings).toContain("Часто задаваемые вопросы");
  });

  it("передаёт SEOHead title/description/canonical", async () => {
    vi.mocked(getCollections).mockResolvedValue([item(1, "horror")]);
    renderPage();
    await screen.findByRole("heading", { level: 1, name: /Подборки книг/ });
    expect(seoProps.title).toBe("Подборки книг — каталог рейтингов и что почитать");
    // конвенция SEOHead: url — путь, домен дописывает сам (иначе двойной canonical)
    expect(seoProps.url).toBe("/collections");
    expect(String(seoProps.description)).toMatch(/подборки/i);
    expect(seoProps.breadcrumbs).toEqual([
      { name: "Главная", url: "/" },
      { name: "Подборки книг", url: "/collections" },
    ]);
  });

  it("мозаика плитки заполняется без пустых ячеек при любом числе обложек", async () => {
    vi.mocked(getCollections).mockResolvedValue([
      item(1, "horror", "Одна"), // в группе 1 подборка → одна колонка мозаики
      item(2, "fantasy", "Первая"), item(5, "fantasy", "Вторая"), // 2 обложки → две колонки
    ]);
    renderPage();
    const horrorTile = await screen.findByRole("link", { name: /Хоррор и мистика/ });
    const fantasyTile = screen.getByRole("link", { name: /Фэнтези/ });
    expect(horrorTile.querySelector(".grid")!.className).toContain("grid-cols-1");
    expect(fantasyTile.querySelector(".grid")!.className).toContain("grid-cols-2");
    expect(fantasyTile.querySelector(".grid")!.className).not.toContain("grid-cols-1");
  });

  it("сетка «Все подборки» на auto-fit — ряд заполняется целиком при любом числе карточек", async () => {
    vi.mocked(getCollections).mockResolvedValue([item(1, null, "Одиночная")]);
    renderPage();
    // секция появляется после прихода данных query
    const heading = await screen.findByRole("heading", { level: 2, name: "Все подборки" });
    const grid = heading.closest("section")?.querySelector<HTMLElement>(".grid");
    expect(grid).toBeTruthy();
    expect(grid!.className).toContain("auto-fit");
    // одиночная карточка растягивается на всю ширину ряда (auto-fit схлопывает пустые колонки)
    expect(grid!.className).toContain("minmax");
  });

  it("отображает пустое состояние, когда подборок нет", async () => {
    vi.mocked(getCollections).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/подборок пока нет/i)).toBeTruthy();
    expect(screen.queryByText("Все подборки")).toBeNull();
  });

  it("показывает ошибку, когда API вернул отказ", async () => {
    vi.mocked(getCollections).mockRejectedValue(new Error("network"));
    renderPage();
    expect(await screen.findByText(/не удалось загрузить/i)).toBeTruthy();
  });
});
