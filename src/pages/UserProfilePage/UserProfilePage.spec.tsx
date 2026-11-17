/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import UserProfilePage from "./UserProfilePage"

const m = vi.hoisted(() => ({
  seoHead: vi.fn(),
  apiGetPublicUser: vi.fn(),
  apiGetUserTierLists: vi.fn(),
  apiGetTasteMatch: vi.fn(),
  useAuth: vi.fn(),
  useUser: vi.fn(),
  useAchievements: vi.fn(),
  useUserAchievements: vi.fn(),
  useMyReadingDna: vi.fn(),
  useGenrePreferences: vi.fn(),
}))

vi.mock("@/lib/userApi", () => ({
  apiGetPublicUser: m.apiGetPublicUser,
  apiGetUserTierLists: m.apiGetUserTierLists,
  apiGetTasteMatch: m.apiGetTasteMatch,
}))

vi.mock("@/hooks/useAuthContext", () => ({ useAuth: m.useAuth }))
vi.mock("@/hooks/useUser", () => ({ useUser: m.useUser }))
vi.mock("@/hooks/useAchievements", () => ({ useAchievements: m.useAchievements }))
vi.mock("@/hooks/useUserAchievements", () => ({ useUserAchievements: m.useUserAchievements }))
vi.mock("@/hooks/useMyReadingDna", () => ({ useMyReadingDna: m.useMyReadingDna }))
vi.mock("@/hooks/useGenrePreferences", () => ({ useGenrePreferences: m.useGenrePreferences }))

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: (props: Record<string, unknown>) => {
    m.seoHead(props)
    return null
  },
}))

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}))

// Тяжёлые листовые компоненты проверены отдельными спеками — здесь заглушки.
vi.mock("@/pages/UserProfilePage/components/ProfileSettings", () => ({
  ProfileSettings: () => <div data-testid="profile-settings">Настройки профиля</div>,
}))
vi.mock("@/pages/UserProfilePage/components/ProfileModeration", () => ({
  ProfileModeration: () => (
    <div data-testid="profile-moderation">Панель модерации</div>
  ),
}))

const OWNER_ID = 2

const mockPublicUser = {
  id: OWNER_ID,
  username: "fedor",
  avatarUrl: "https://example.com/avatar.jpg",
  bio: "Люблю книги про робототехнику",
  socialLinks: [{ platform: "telegram", url: "https://t.me/fedor_books" }],
  isDonor: true,
  xp: 290,
  title: "Страничный глотатель",
  icon: "📄",
  role: "admin",
  createdAt: "2024-01-01T00:00:00.000Z",
  badges: [],
  genrePreferences: [],
  dna: null,
  stats: {
    tierListsCount: 9,
    publishedCount: 2,
    likesCount: 3,
    totalBooks: 18,
    lastActivity: "2024-06-01T00:00:00.000Z",
  },
}

const mockOwnerUser = {
  id: OWNER_ID,
  email: "fedor@example.com",
  username: "fedor",
  avatarUrl: "https://example.com/avatar.jpg",
  bio: "Люблю книги про робототехнику",
  socialLinks: [{ platform: "telegram", url: "https://t.me/fedor_books" }],
  role: "user",
  isDonor: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  badges: [],
}

const mockOwnerStats = {
  tierListsCount: 9,
  publishedCount: 2,
  templatesCount: 4,
  likesCount: 3,
  likesTodayCount: 0,
  totalBooks: 18,
  lastActivity: null,
  totalActiveMinutes: 0,
}

const mockTierLists = [
  {
    id: "tl-1",
    title: "Top Sci-Fi Books",
    likesCount: 3,
    booksCount: 2,
    updatedAt: "2024-06-01T00:00:00.000Z",
    user: { username: "fedor", avatarUrl: null },
  },
]

const mockTasteMatch = {
  matchPercent: 25,
  commonBooks: 1,
  totalBooks: 3,
}

function setViewer(userId: number | null, role = "user") {
  m.useAuth.mockReturnValue({
    user: userId === null ? null : { userId, username: "currentuser", role },
    isAuthenticated: userId !== null,
  })
}

function renderWithRoute(routeId: string, search = "") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/users/${routeId}${search}`]}>
        <Routes>
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/templates" element={<div>СТРАНИЦА ШАБЛОНОВ</div>} />
          <Route path="/tier-lists/:id" element={<div>СТРАНИЦА ТИР-ЛИСТА</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("UserProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setViewer(OWNER_ID)
    m.useUser.mockReturnValue({
      user: mockOwnerUser,
      stats: mockOwnerStats,
      isLoading: false,
      updateProfile: vi.fn(),
      uploadAvatar: vi.fn(),
      refreshUser: vi.fn(),
    })
    m.useAchievements.mockReturnValue({
      achievements: [],
      status: { xp: 290, title: "Страничный глотатель", icon: "📄" },
      isLoading: false,
    })
    m.useUserAchievements.mockReturnValue({ data: [], isLoading: false })
    m.useMyReadingDna.mockReturnValue({ dna: null, isLoading: false })
    m.useGenrePreferences.mockReturnValue({ data: [] })
    m.apiGetPublicUser.mockResolvedValue(mockPublicUser)
    m.apiGetUserTierLists.mockResolvedValue({
      data: mockTierLists,
      meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
    })
    m.apiGetTasteMatch.mockResolvedValue(mockTasteMatch)
  })

  /* ── Режим владельца ── */

  it("владелец видит табы с «Настройками», камеру и «Как видят другие»", async () => {
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Сменить аватар" })).toBeDefined()
    })
    expect(screen.getByRole("tab", { name: "Обзор" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Тир-листы" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Достижения" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Настройки" })).toBeDefined()
    expect(screen.getByRole("button", { name: /Как видят другие/ })).toBeDefined()
    expect(screen.getByRole("button", { name: /Редактировать профиль/ })).toBeDefined()
    // Данные владельца идут только из авторизованных эндпоинтов.
    expect(m.apiGetPublicUser).not.toHaveBeenCalled()
    expect(m.apiGetTasteMatch).not.toHaveBeenCalled()
  })

  it("переключает таб на «Настройки» по кнопке «+ Соцсеть»", async () => {
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Соцсеть/ })).toBeDefined()
    })
    fireEvent.click(screen.getByRole("button", { name: /\+ Соцсеть/ }))

    await waitFor(() => {
      expect(screen.getByTestId("profile-settings")).toBeDefined()
      expect(screen.getByRole("tab", { name: "Настройки" }).getAttribute("aria-selected")).toBe("true")
    })
  })

  /* ── Режим посетителя ── */

  it("посетитель не видит настройки и управление, но сохраняет Header, хлебные крошки и «Назад»", async () => {
    setViewer(99)
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "fedor" })).toBeDefined()
    })
    expect(screen.queryByRole("tab", { name: "Настройки" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Сменить аватар" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Как видят другие/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Редактировать профиль/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Управление/ })).toBeNull()
    expect(screen.queryByTestId("profile-moderation")).toBeNull()
    // Навигация сохранена как есть.
    expect(screen.getByTestId("dashboard-layout")).toBeDefined() // Header внутри layout
    expect(screen.getByRole("navigation", { name: "Хлебные крошки" })).toBeDefined()
    expect(screen.getByRole("button", { name: /Назад/ })).toBeDefined()
  })

  it("staff-посетитель видит «Управление» и раскрывает панель модерации", async () => {
    setViewer(99, "admin")
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Управление/ })).toBeDefined()
    })
    expect(screen.queryByTestId("profile-moderation")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Управление/ }))

    await waitFor(() => {
      expect(screen.getByTestId("profile-moderation")).toBeDefined()
    })

    fireEvent.click(screen.getByRole("button", { name: /Управление/ }))
    await waitFor(() => {
      expect(screen.queryByTestId("profile-moderation")).toBeNull()
    })
  })

  /* ── Предпросмотр ── */

  it("?preview=1 у владельца скрывает настройки и управление, навигация остаётся", async () => {
    renderWithRoute(String(OWNER_ID), "?preview=1")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "fedor" })).toBeDefined()
    })
    expect(screen.queryByRole("tab", { name: "Настройки" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Сменить аватар" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Как видят другие/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Редактировать профиль/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /\+ Соцсеть/ })).toBeNull()
    expect(screen.getByTestId("dashboard-layout")).toBeDefined()
    expect(screen.getByRole("navigation", { name: "Хлебные крошки" })).toBeDefined()
    expect(screen.getByRole("button", { name: /Назад/ })).toBeDefined()
    expect(m.apiGetTasteMatch).not.toHaveBeenCalled()
  })

  /* ── SEO ── */

  it("SEOHead получает noindex", async () => {
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(m.seoHead).toHaveBeenCalled()
    })
    expect(m.seoHead).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true, type: "profile" }),
    )
  })

  /* ── Совпадение вкусов ── */

  it("показывает совпадение вкусов авторизованному посетителю", async () => {
    setViewer(99)
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByText(/Совпадение вкусов/)).toBeDefined()
    })
    expect(m.apiGetTasteMatch).toHaveBeenCalledWith(String(OWNER_ID))
    expect(screen.getByText("25%")).toBeDefined()
  })

  it("раскрывает список совпавших книг по клику на баннер", async () => {
    setViewer(99)
    m.apiGetTasteMatch.mockResolvedValue({
      matchPercent: 50,
      commonBooks: 2,
      totalBooks: 4,
      matches: [
        {
          book: { title: "Дюна", author: "Фрэнк Герберт", coverImageUrl: "https://example.com/dune.jpg" },
          tierInProfile: "S",
          tierInProfileRank: 0,
          tierInMine: "A",
          tierInMineRank: 1,
        },
      ],
    })
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByText(/Совпадение вкусов/)).toBeDefined()
    })

    const toggleButton = screen.getByRole("button", { name: /Совпадение вкусов/ })
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(toggleButton.getAttribute("aria-expanded")).toBe("true")
      expect(screen.getByText(/А где поставили/)).toBeDefined()
      expect(screen.getByText(/Дюна \(Фрэнк Герберт\)/)).toBeDefined()
    })
  })

  it("гость не запрашивает tasteMatch", async () => {
    setViewer(null)
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "fedor" })).toBeDefined()
    })
    expect(m.apiGetTasteMatch).not.toHaveBeenCalled()
    expect(screen.queryByText(/Совпадение вкусов/)).toBeNull()
  })

  /* ── Ошибки и пустые состояния ── */

  it("ошибка загрузки профиля показывает прежнее состояние ошибки", async () => {
    setViewer(99)
    m.apiGetPublicUser.mockRejectedValue(new Error("Пользователь не найден"))
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByText("Пользователь не найден")).toBeDefined()
    })
    expect(screen.getByRole("button", { name: /Назад/ })).toBeDefined()
  })

  it("показывается сообщение, если нет публичных тир-листов", async () => {
    m.apiGetUserTierLists.mockResolvedValue({
      data: [],
      meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
    })
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByText("Пока нет публичных тир-листов")).toBeDefined()
    })
  })

  it("показывает пометку «Приватный» для приватного тир-листа", async () => {
    m.apiGetUserTierLists.mockResolvedValue({
      data: [
        {
          id: "tl-private",
          title: "Секретный список",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
          isPublic: false,
          likesCount: 0,
          booksCount: 0,
          user: { username: "fedor", avatarUrl: null },
        },
      ],
      meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
    })
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByText("Приватный")).toBeDefined()
    })
  })

  /* ── Взаимодействие ── */

  it("переходит на вкладку «Тир-листы» по клику на карточку статистики", async () => {
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Тир-листов/ })).toBeDefined()
    })
    fireEvent.click(screen.getByRole("button", { name: /Тир-листов/ }))

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Тир-листы" }).getAttribute("aria-selected")).toBe("true")
      expect(screen.getByText("Top Sci-Fi Books")).toBeDefined()
    })
  })

  it("ведёт на страницу тир-листа по клику на карточку", async () => {
    setViewer(99)
    renderWithRoute(String(OWNER_ID))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Top Sci-Fi Books/ })).toBeDefined()
    })
    fireEvent.click(screen.getByRole("button", { name: /Top Sci-Fi Books/ }))

    await waitFor(() => {
      expect(screen.getByText("СТРАНИЦА ТИР-ЛИСТА")).toBeDefined()
    })
  })
})
