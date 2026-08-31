import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Footer } from "./Footer";
import { apiClient } from "@/lib/api-client";
import { getCollections } from "@/lib/collectionsApi";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

vi.mock("@/lib/collectionsApi", () => ({
  getCollections: vi.fn(),
}))

const mockedGet = vi.mocked(apiClient.get)
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
    mockedGet.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter();

    const link = screen.getByRole("link", { name: /Поддержать проект/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });

  it("подпись «Меценаты проекта:» стоит слева от бегущей строки донаторов на одном уровне", async () => {
    mockedGet.mockResolvedValue([{ id: 1, name: "Аноним" }])
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
    mockedGet.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter();

    await waitFor(() => {
      expect(screen.queryByText("Меценаты проекта:")).not.toBeInTheDocument()
    })
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })
})
