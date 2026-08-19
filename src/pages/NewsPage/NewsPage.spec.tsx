// src/pages/NewsPage/NewsPage.spec.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NewsPage from "./NewsPage";
import { getNewsById } from "@/lib/newsApi";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/lib/newsApi", () => ({
  getNewsById: vi.fn(),
}));

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

vi.mock("sileo", () => ({
  sileo: { error: vi.fn() },
}));

const mockArticle = {
  id: "1",
  title: "Новая подборка хорроров",
  excerpt: "Десять книг, от которых мурашки",
  content: "<p>Текст новости</p>",
  imageUrl: "https://example.com/cover1.jpg",
  tags: ["Хоррор"],
  authorId: 1,
  authorName: "Админ",
  publishedAt: "2026-08-01T12:00:00Z",
  isPublished: true,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-01T10:00:00Z",
};

describe("NewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("показывает обложку статьи, если она есть", async () => {
    vi.mocked(getNewsById).mockResolvedValue(mockArticle);
    render(
      <MemoryRouter>
        <NewsPage />
      </MemoryRouter>,
    );

    const img = await screen.findByAltText("Новая подборка хорроров");
    expect(img).toHaveAttribute("src", "https://example.com/cover1.jpg");
  });

  it("не показывает обложку, если её нет", async () => {
    vi.mocked(getNewsById).mockResolvedValue({
      ...mockArticle,
      imageUrl: null,
    });
    render(
      <MemoryRouter>
        <NewsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Текст новости")).toBeTruthy();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("делает имя автора ссылкой на профиль", async () => {
    vi.mocked(getNewsById).mockResolvedValue(mockArticle);
    render(
      <MemoryRouter>
        <NewsPage />
      </MemoryRouter>,
    );

    const authorLink = await screen.findByRole("link", { name: "Админ" });
    expect(authorLink).toHaveAttribute("href", "/users/1");
  });
});
