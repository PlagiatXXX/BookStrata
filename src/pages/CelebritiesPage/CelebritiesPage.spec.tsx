import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import CelebritiesPage from "./CelebritiesPage";

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/components/SEO/Breadcrumbs", () => ({
  Breadcrumbs: () => null,
}));

vi.mock("@/lib/celebritiesApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/celebritiesApi")>(
    "@/lib/celebritiesApi",
  );
  return {
    ...actual,
    getCelebrities: vi.fn(),
  };
});

import { getCelebrities, type CelebrityItem } from "@/lib/celebritiesApi";

const mockGetCelebrities = vi.mocked(getCelebrities);

const bookStub = {
  id: "b1",
  title: "Книга",
  author: "Автор",
  coverImageUrl: "https://example.com/cover.jpg",
} as CelebrityItem["books"] extends (infer B)[] ? B : NonNullable<CelebrityItem["books"]>[string];

function createCelebrity(
  overrides: Partial<CelebrityItem> & { id: number },
): CelebrityItem {
  return {
    slug: `celebrity-${overrides.id}`,
    name: `Знаменитость ${overrides.id}`,
    photoUrl: `https://example.com/photo-${overrides.id}.png`,
    biography: null,
    category: "actor",
    isPublished: true,
    order: overrides.id,
    tags: [],
    books: { b1: bookStub, b2: bookStub, b3: bookStub },
    unrankedBookIds: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CelebritiesPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );
}

describe("CelebritiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит карточки с именем, категорией и бейджем книг", async () => {
    mockGetCelebrities.mockResolvedValue([createCelebrity({ id: 1 })]);

    renderPage();

    await screen.findByText("Знаменитость 1");
    const card = screen.getByRole("link", { name: /Знаменитость 1/i });
    expect(card.textContent).toContain("Актёры");
    expect(card.textContent).toContain("3 книги");
    expect(card).toHaveAttribute("href", "/celebrities/celebrity-1");
  });

  it("рендерит ровную сетку: карточки без data-size/data-featured", async () => {
    mockGetCelebrities.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => createCelebrity({ id: i + 1 })),
    );

    const { container } = renderPage();

    await screen.findAllByText(/Знаменитость/);
    const cards = container.querySelectorAll(".celebrity-card");
    expect(cards.length).toBe(5);
    cards.forEach((card) => {
      expect(card.hasAttribute("data-size")).toBe(false);
      expect(card.hasAttribute("data-featured")).toBe(false);
    });
  });

  it("палитра фона стабильна: одинаковый фон для id с одинаковым остатком", async () => {
    mockGetCelebrities.mockResolvedValue([
      createCelebrity({ id: 1 }),
      createCelebrity({ id: 2 }),
      createCelebrity({ id: 11 }),
    ]);

    const { container } = renderPage();

    await screen.findAllByText(/Знаменитость/);
    const cards = Array.from(container.querySelectorAll<HTMLElement>(".celebrity-card"));
    const bgOf = (id: number) => {
      const card = cards.find((c) =>
        c.querySelector("img")?.getAttribute("src")?.includes(`photo-${id}.png`),
      );
      return card?.style.getPropertyValue("--card-bg");
    };

    // id 1 и 11 → одинаковый остаток при делении на размер палитры
    expect(bgOf(1)).toBeTruthy();
    expect(bgOf(1)).toBe(bgOf(11));
    expect(bgOf(2)).not.toBe(bgOf(1));
  });

  it("показывает 6 карточек и подгружает по 6 по клику «Показать больше»", async () => {
    mockGetCelebrities.mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => createCelebrity({ id: i + 1 })),
    );

    renderPage();

    const user = userEvent.setup();

    // Первая партия — 6 карточек (2 ряда)
    const firstBatch = await screen.findAllByText(/Знаменитость/);
    expect(firstBatch.length).toBe(6);

    const showMore = screen.getByRole("button", { name: /Показать больше/i });
    await user.click(showMore);

    // Вторая партия — 12 карточек (4 ряда)
    expect(await screen.findAllByText(/Знаменитость/)).toHaveLength(12);

    // Кнопка всё ещё есть — остались непоказанные
    expect(
      screen.getByRole("button", { name: /Показать больше/i }),
    ).toBeTruthy();

    // Показываем оставшиеся
    await user.click(screen.getByRole("button", { name: /Показать больше/i }));
    expect(await screen.findAllByText(/Знаменитость/)).toHaveLength(15);

    // Все показаны — кнопка исчезает
    expect(
      screen.queryByRole("button", { name: /Показать больше/i }),
    ).toBeNull();
  });

  it("без фото показывает заглушку с первой буквой имени", async () => {
    mockGetCelebrities.mockResolvedValue([
      createCelebrity({ id: 1, photoUrl: "", name: "Пушкин" }),
    ]);

    renderPage();

    await screen.findByText("П");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("карточка содержит силуэт-фото с классом celebrity-card-img", async () => {
    mockGetCelebrities.mockResolvedValue([createCelebrity({ id: 1 })]);

    const { container } = renderPage();

    await screen.findAllByText(/Знаменитость/);
    const img = container.querySelector<HTMLImageElement>(
      ".celebrity-card-img",
    );
    expect(img).toBeTruthy();
    expect(img?.getAttribute("alt")).toBe("Знаменитость 1");
  });
});
