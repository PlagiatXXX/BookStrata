import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, waitFor, fireEvent } from "@testing-library/react";
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

const TEST_CARD_NUMBER = "0000 0000 0000 0000"
let originalCardNumber: string | undefined

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
  originalCardNumber = import.meta.env.VITE_DONATE_CARD_NUMBER
  ;(import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER = TEST_CARD_NUMBER

  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
    }
    observe() {
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
})

afterEach(() => {
  if (originalCardNumber !== undefined) {
    ;(import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER = originalCardNumber
  } else {
    delete (import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER
  }
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

  it("запрашивает подборки для ссылок футера при появлении в области видимости", async () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([
      { id: 1, slug: "scifi", title: "Фантастика" } as unknown as import("@/types/collection").CollectionItem,
    ])

    renderFooter()

    await waitFor(() => {
      expect(mockedGetCollections).toHaveBeenCalled()
    })
  })

  it("содержит ссылку на страницу для правообладателей /copyright в навигации", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    const copyrightLinks = screen.getAllByRole("link", { name: /Правообладателям/i })
    expect(copyrightLinks.length).toBeGreaterThanOrEqual(1)
    expect(copyrightLinks[0]).toHaveAttribute("href", "/copyright")
  })

  it("содержит сквозной дисклеймер со ст. 1274 ГК РФ и ссылкой на /copyright", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    expect(
      screen.getByText(/Все права на представленные на сайте изображения обложек/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /Информация для правообладателей/i }),
    ).toHaveAttribute("href", "/copyright")
  })

  it("содержит ссылку на почту bookstrata@mail.ru в блоке соцсетей", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    const mailLink = screen.getByRole("link", { name: /Почта/i })
    expect(mailLink).toHaveAttribute("href", "mailto:bookstrata@mail.ru")
  })

  it("по умолчанию меню доната не отрисовывается в DOM (номер карты изолирован от поисковиков)", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    expect(document.getElementById("donate-menu")).toBeNull()
    expect(screen.queryByText(TEST_CARD_NUMBER)).not.toBeInTheDocument()
  })

  it("при клике на кнопку «Угостить автора кофе» меню доната монтируется в DOM", async () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    const donateButton = screen.getByRole("button", { name: /Угостить автора кофе/i })
    expect(document.getElementById("donate-menu")).toBeNull()

    fireEvent.click(donateButton)

    expect(document.getElementById("donate-menu")).not.toBeNull()
    expect(screen.getByText(TEST_CARD_NUMBER)).toBeInTheDocument()
  })

  it("блок доната содержит data-nosnippet для защиты сниппетов поисковых систем", () => {
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    const donateContainer = document.querySelector("[data-nosnippet]")
    expect(donateContainer).not.toBeNull()
  })

  it("если VITE_DONATE_CARD_NUMBER не задан — кнопка доната не рендерится", () => {
    delete (import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER
    mockedGetDonors.mockResolvedValue([])
    mockedGetCollections.mockResolvedValue([])

    renderFooter()

    expect(screen.queryByRole("button", { name: /Угостить автора кофе/i })).not.toBeInTheDocument()
  })
})
