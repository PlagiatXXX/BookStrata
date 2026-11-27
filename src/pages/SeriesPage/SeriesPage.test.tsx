import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import SeriesPage from "./SeriesPage";
import { buildSeriesJsonLd } from "./seo";
import type { SeriesDetail } from "@/lib/seriesApi";

const getSeriesMock = vi.fn();

vi.mock("@/lib/seriesApi", () => ({
  getSeries: (...args: unknown[]) => getSeriesMock(...args),
}));

vi.mock("@/ui/Header", () => ({ Header: () => <div data-testid="header" /> }));
vi.mock("@/ui/Footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("@/ui/MobileBottomNav", () => ({ MobileBottomNav: () => null }));

const SAMPLE_SERIES: SeriesDetail = {
  id: 1,
  name: "Ведьмак",
  slug: "vedmak",
  description: "Фэнтези-цикл Анджея Сапковского.",
  coverImageUrl: null,
  authorId: 7,
  author: { id: 7, name: "Анджей Сапковский", slug: "andzhej-sapkovskij" },
  createdAt: "2026-11-28T00:00:00.000Z",
  updatedAt: "2026-11-28T00:00:00.000Z",
  books: [
    {
      id: 10,
      slug: "poslednee-zhelanie",
      title: "Последнее желание",
      author: "Анджей Сапковский",
      coverImageUrl: "https://cdn.example.com/1.jpg",
      genre: "Фэнтези",
      rating: 9.2,
      publishedYear: 1993,
      ageRating: "16+",
      seriesOrder: 1,
    },
    {
      id: 11,
      slug: "mech-prednaznacheniya",
      title: "Меч предназначения",
      author: "Анджей Сапковский",
      coverImageUrl: "https://cdn.example.com/2.jpg",
      genre: "Фэнтези",
      rating: 9.0,
      publishedYear: 1992,
      ageRating: "16+",
      seriesOrder: 2,
    },
  ],
};

function renderPage(initialEntry = "/series/vedmak") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/series/:slug" element={<SeriesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("SeriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит название цикла, описание, автора и книги по порядку с бейджами №N", async () => {
    getSeriesMock.mockResolvedValue(SAMPLE_SERIES);
    renderPage("/series/vedmak?from=mech-prednaznacheniya");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ведьмак" })).toBeInTheDocument();
    });

    expect(screen.getByText("Фэнтези-цикл Анджея Сапковского.")).toBeInTheDocument();
    expect(screen.getByText("№1")).toBeInTheDocument();
    expect(screen.getByText("№2")).toBeInTheDocument();
    expect(screen.getByText("Последнее желание")).toBeInTheDocument();
    expect(screen.getByText("Меч предназначения")).toBeInTheDocument();
    expect(screen.getByText("Текущая книга")).toBeInTheDocument();
  });

  it("показывает пустое состояние, если в цикле нет книг", async () => {
    getSeriesMock.mockResolvedValue({ ...SAMPLE_SERIES, books: [] });
    renderPage("/series/vedmak");

    await waitFor(() => {
      expect(
        screen.getByText("В цикле пока нет опубликованных книг."),
      ).toBeInTheDocument();
    });
  });

  it("показывает 404, если цикл не найден", async () => {
    getSeriesMock.mockResolvedValue(null);
    renderPage("/series/unknown-series");

    await waitFor(() => {
      expect(screen.getByText(/404|не найдена/i)).toBeInTheDocument();
    });
  });

  it("формирует валидный JSON-LD BookSeries с hasPart", () => {
    const ld = buildSeriesJsonLd(SAMPLE_SERIES, "https://cdn.example.com/1.jpg");
    expect(ld["@type"]).toBe("BookSeries");
    expect(ld.name).toBe("Ведьмак");
    expect(Array.isArray(ld.hasPart)).toBe(true);
    expect((ld.hasPart as Array<{ name: string }>)[0].name).toBe(
      "Последнее желание",
    );
  });
});
