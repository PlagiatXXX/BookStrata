import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import AdminAuthorsPage from "./AdminAuthorsPage"

vi.mock("@/lib/adminAuthorsApi", () => ({
  listAdminAuthors: vi.fn(),
  getAdminAuthorContent: vi.fn(),
  saveAdminAuthorContent: vi.fn(),
  uploadAuthorHero: vi.fn(),
}))

vi.mock("@/lib/adminBooksApi", () => ({
  listAdminBooks: vi.fn(),
}))

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}))

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}))

import {
  listAdminAuthors,
  getAdminAuthorContent,
  saveAdminAuthorContent,
  uploadAuthorHero,
} from "@/lib/adminAuthorsApi"
import { listAdminBooks } from "@/lib/adminBooksApi"

const mockAuthors = [
  {
    id: 1,
    name: "Лев Толстой",
    slug: "lev-tolstoy",
    statsCount: 3,
    showcaseCount: 2,
    adaptationsCount: 1,
    pressQuotesCount: 0,
  },
  {
    id: 2,
    name: "Фёдор Достоевский",
    slug: "fedor-dostoevsky",
    statsCount: 0,
    showcaseCount: 0,
    adaptationsCount: 0,
    pressQuotesCount: 0,
  },
]

const mockContent = {
  heroImageUrl: null,
  badge: "Классик",
  motto: "Все счастливые семьи похожи",
  manifestoQuote: "Яичница бывает двух родов",
  manifestoAuthor: "Лев Толстой",
  manifestoRole: "Писатель",
  aboutText: "Описание автора",
  stats: [{ value: "50+", label: "Книг" }],
  showcase: [{ bookId: 10, title: "Анна Каренина", pullQuote: "Шедевр" }],
  adaptations: [
    {
      kind: "film" as const,
      title: "Анна Каренина",
      meta: "2012",
      description: null,
      url: null,
    },
  ],
  pressQuotes: [
    { quote: "Великий роман", source: "Итоги", sourceRole: "Критик" },
  ],
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  )
}

async function renderWithAuthorSelected() {
  vi.mocked(listAdminAuthors).mockResolvedValue(mockAuthors)
  vi.mocked(getAdminAuthorContent).mockResolvedValue(mockContent)
  vi.mocked(listAdminBooks).mockResolvedValue({
    items: [{ id: 10, title: "Анна Каренина" }],
    total: 1,
  } as any)

  render(<AdminAuthorsPage />, { wrapper: createWrapper() })

  await waitFor(() => {
    expect(screen.getByTestId("author-item-1")).toBeInTheDocument()
  })
  await userEvent.click(screen.getByTestId("author-item-1"))
  await waitFor(() => {
    expect(getAdminAuthorContent).toHaveBeenCalledWith(1)
  })
  await screen.findByLabelText("Девиз")
}

describe("AdminAuthorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("поиск отображает авторов с флагами счётчиков (только ненулевые)", async () => {
    vi.mocked(listAdminAuthors).mockResolvedValue(mockAuthors)

    render(<AdminAuthorsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(listAdminAuthors).toHaveBeenCalledWith(undefined)
    })

    const input = screen.getByPlaceholderText("Поиск автора...")
    await userEvent.type(input, "Толстой")

    await waitFor(() => {
      expect(listAdminAuthors).toHaveBeenCalledWith("Толстой")
    })
    await waitFor(() => {
      expect(screen.getByTestId("author-item-1")).toBeInTheDocument()
    })

    const item = screen.getByTestId("author-item-1")
    expect(within(item).getByText("Лев Толстой")).toBeInTheDocument()
    expect(within(item).getByText("lev-tolstoy")).toBeInTheDocument()
    expect(within(item).getByText("Статистика: 3")).toBeInTheDocument()
    expect(within(item).getByText("Showcase: 2")).toBeInTheDocument()
    expect(within(item).getByText("Экранизации: 1")).toBeInTheDocument()
    // pressQuotesCount: 0 — бейдж не показывается
    expect(within(item).queryByText(/Пресса/)).not.toBeInTheDocument()

    // Автор вовсе без контента — без единого бейджа
    const empty = screen.getByTestId("author-item-2")
    expect(within(empty).queryByText(/Статистика/)).not.toBeInTheDocument()
    expect(within(empty).queryByText(/Showcase/)).not.toBeInTheDocument()
  })

  it("один символ в поиске — подсказка «Введите 2 и более символа», не «не найдены»", async () => {
    vi.mocked(listAdminAuthors).mockResolvedValue(mockAuthors)

    render(<AdminAuthorsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(listAdminAuthors).toHaveBeenCalledWith(undefined)
    })

    const input = screen.getByPlaceholderText("Поиск автора...")
    await userEvent.type(input, "Л")

    expect(
      await screen.findByText(/Введите 2 и более символа/),
    ).toBeInTheDocument()
    expect(screen.queryByText("Авторы не найдены")).not.toBeInTheDocument()
    expect(listAdminAuthors).not.toHaveBeenCalledWith("Л")
  })

  it("выбор автора грузит контент в форму и книги в селект showcase", async () => {
    await renderWithAuthorSelected()

    expect(screen.getByLabelText("Бейдж")).toHaveValue("Классик")
    expect(screen.getByLabelText("Девиз")).toHaveValue(
      "Все счастливые семьи похожи",
    )
    expect(screen.getByLabelText("Описание автора")).toHaveValue(
      "Описание автора",
    )
    expect(screen.getAllByLabelText("Значение")[0]).toHaveValue("50+")
    expect(screen.getAllByLabelText("Книга")[0]).toHaveValue("10")

    expect(listAdminBooks).toHaveBeenCalledWith({ authorId: 1, limit: 100 })
    expect(screen.getAllByLabelText("Книга")[0]).toHaveValue("10")
    expect(
      await screen.findByRole("option", { name: "Анна Каренина" }),
    ).toBeInTheDocument()
  })

  it("напоминалка о параметрах портрета героя есть, showcase-подсказка убрана", async () => {
    await renderWithAuthorSelected()

    expect(
      screen.getByText(/Портрет 3:4.*1200×1600.*до 300 КБ/),
    ).toBeInTheDocument()
    // Обложки showcase подтягиваются из книги автоматически — подсказка не нужна
    expect(
      screen.queryByText(/Обложки книг.*2:3.*600×900/),
    ).not.toBeInTheDocument()
  })

  it("загрузка hero-фото: файл → uploadAuthorHero → URL подставился в инпут", async () => {
    vi.mocked(uploadAuthorHero).mockResolvedValue({
      heroImageUrl: "https://cdn.example.com/hero.webp",
    })
    await renderWithAuthorSelected()

    const file = new File(["img"], "hero.png", { type: "image/png" })
    const input = screen.getByLabelText("Загрузить фото")
    await userEvent.upload(input, file)

    await waitFor(() => {
      expect(uploadAuthorHero).toHaveBeenCalledWith(file)
      expect(screen.getByLabelText("URL изображения героя")).toHaveValue(
        "https://cdn.example.com/hero.webp",
      )
    })
  })

  it("ошибка загрузки hero-фото → сообщение, URL не изменился", async () => {
    vi.mocked(uploadAuthorHero).mockRejectedValue(new Error("Файл слишком большой"))
    await renderWithAuthorSelected()

    const file = new File(["img"], "hero.png", { type: "image/png" })
    await userEvent.upload(screen.getByLabelText("Загрузить фото"), file)

    expect(await screen.findByText(/Не удалось загрузить фото/)).toBeInTheDocument()
    expect(screen.getByLabelText("URL изображения героя")).toHaveValue("")
  })

  it("сохранение вызывает saveAdminAuthorContent с собранным payload", async () => {
    vi.mocked(saveAdminAuthorContent).mockResolvedValue({ ok: true })
    await renderWithAuthorSelected()

    // Пустая строка → null при отправке
    await userEvent.clear(screen.getByLabelText("Бейдж"))
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => {
      expect(saveAdminAuthorContent).toHaveBeenCalledWith(1, {
        heroImageUrl: null,
        badge: null,
        motto: "Все счастливые семьи похожи",
        manifestoQuote: "Яичница бывает двух родов",
        manifestoAuthor: "Лев Толстой",
        manifestoRole: "Писатель",
        aboutText: "Описание автора",
        stats: [{ value: "50+", label: "Книг" }],
        showcase: [{ bookId: 10, pullQuote: "Шедевр" }],
        adaptations: [
          {
            kind: "film",
            title: "Анна Каренина",
            meta: "2012",
            description: null,
            url: null,
          },
        ],
        pressQuotes: [
          { quote: "Великий роман", source: "Итоги", sourceRole: "Критик" },
        ],
      })
    })
    expect(
      await screen.findByText(/Контент автора сохранён/),
    ).toBeInTheDocument()
  })

  it("пустой showcase (удалить все карточки) → в payload showcase: []", async () => {
    vi.mocked(saveAdminAuthorContent).mockResolvedValue({ ok: true })
    await renderWithAuthorSelected()

    await userEvent.click(screen.getByRole("button", { name: "Удалить книгу" }))
    expect(
      screen.queryByLabelText("Цитата к книге"),
    ).not.toBeInTheDocument()
    expect(screen.getByText("Книг нет")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => {
      expect(saveAdminAuthorContent).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ showcase: [] }),
      )
    })
  })

  it("неудачная загрузка контента (автор не найден) → сообщение об ошибке", async () => {
    vi.mocked(listAdminAuthors).mockResolvedValue(mockAuthors)
    vi.mocked(getAdminAuthorContent).mockRejectedValue(new Error("Автор не найден"))

    render(<AdminAuthorsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId("author-item-1")).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId("author-item-1"))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Автор не найден")
  })

  it("ошибка API при сохранении → сообщение об ошибке в UI, без падения", async () => {
    vi.mocked(saveAdminAuthorContent).mockRejectedValue(new Error("Сервер недоступен"))
    await renderWithAuthorSelected()

    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Сервер недоступен")
    expect(
      screen.queryByText(/Контент автора сохранён/),
    ).not.toBeInTheDocument()
  })
})
