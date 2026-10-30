import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Footer } from "./Footer";
import { getDonors } from "@/lib/donorsApi";
import { getCollections } from "@/lib/collectionsApi";

vi.mock("@/lib/donorsApi", () => ({
  getDonors: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/collectionsApi", () => ({
  getCollections: vi.fn(),
}))

const mockedGetDonors = vi.mocked(getDonors)
const mockedGetCollections = vi.mocked(getCollections)

function renderFooter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Footer", () => {
  it("содержит ссылку на /pricing (страница не должна быть сиротой для поисковиков)", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter();

    const link = screen.getByRole("link", { name: /Поддержать проект/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });

  it("содержит ссылку на раздел авторов /authors (перелинковка)", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter();

    const link = screen.getByRole("link", { name: /Все авторы/i });
    expect(link).toHaveAttribute("href", "/authors");
  });

  it("подпись «Меценаты проекта:» стоит слева от бегущей строки донаторов на одном уровне", async () => {
    mockedGetDonors.mockResolvedValue([{ id: 1, name: "Аноним" }])
    mockedGetCollections.mockResolvedValue([])

    renderFooter();

    // Подпись видна (появляется только вместе со строкой донаторов)
    const label = await screen.findByText("Меценаты проекта:")
    expect(label).toBeInTheDocument()

    // Строка донаторов отрисована
    expect(screen.getByText(/Аноним/)).toBeInTheDocument()

    // Подпись и строка — соседи по flex-строке одного блока
    const marqueeText = screen.getByText(/Аноним/)
    const labelRow = label.closest("[data-testid='donor-marquee']")
    const marqueeRow = marqueeText.closest("[data-testid='donor-marquee']")
    expect(labelRow).toBe(marqueeRow)
    expect(labelRow).not.toBeNull()
  })

  it("без донаторов ни строки, ни подписи нет", async () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter();

    await waitFor(() => {
      expect(screen.queryByText("Меценаты проекта:")).not.toBeInTheDocument()
    })
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })
})
