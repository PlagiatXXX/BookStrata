/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import UserProfilePage from "./UserProfilePage"
import * as userApiModule from "@/lib/userApi"
import * as authContextModule from "@/hooks/useAuthContext"

vi.mock("@/lib/userApi", () => ({
  apiGetPublicUser: vi.fn(),
  apiGetUserTierLists: vi.fn(),
  apiGetTasteMatch: vi.fn(),
}))

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}))

const mockPublicUser = {
  id: 2,
  username: "fedor",
  avatarUrl: "https://example.com/avatar.jpg",
  isPro: true,
  xp: 290,
  title: "Страничный глотатель",
  role: "admin",
  createdAt: "2024-01-01T00:00:00.000Z",
  stats: {
    tierListsCount: 9,
    publishedCount: 2,
    likesCount: 3,
    totalBooks: 18,
    lastActivity: "2024-06-01T00:00:00.000Z",
  },
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

function renderWithRoute(routeId: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/users/${routeId}`]}>
        <Routes>
          <Route path="/users/:id" element={<UserProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("UserProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 2, username: "currentuser", avatarUrl: null, role: "user", isPro: false },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any)
    vi.mocked(userApiModule.apiGetPublicUser).mockResolvedValue(mockPublicUser)
    vi.mocked(userApiModule.apiGetUserTierLists).mockResolvedValue({
      data: mockTierLists,
      meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
    })
    vi.mocked(userApiModule.apiGetTasteMatch).mockResolvedValue(mockTasteMatch)
  })

  it("должен отобразить профиль пользователя с данными", async () => {
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText("fedor")).toBeDefined()
    })
    expect(screen.getByText("Pro")).toBeDefined()
    expect(screen.getByText("Админ")).toBeDefined()
    expect(screen.getByText("Страничный глотатель")).toBeDefined()
  })

  it("должен отобразить совпадение вкусов для чужого профиля", async () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 3, username: "other", avatarUrl: null, role: "user", isPro: false },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any)
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText(/Совпадение вкусов/)).toBeDefined()
    })
    expect(screen.getByText("25%")).toBeDefined()
  })

  it("не должен отображать совпадение вкусов для своего профиля", async () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 1, username: "current", avatarUrl: null, role: "user", isPro: false },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any)
    vi.mocked(userApiModule.apiGetPublicUser).mockResolvedValue({ ...mockPublicUser, id: 1 })
    renderWithRoute("1")

    await waitFor(() => {
      expect(screen.getByText("fedor")).toBeDefined()
    })
    const matchSection = screen.queryByText(/Совпадение вкусов/)
    expect(matchSection).toBeNull()
  })

  it("должен отобразить список публичных тир-листов", async () => {
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText("Top Sci-Fi Books")).toBeDefined()
    })
    expect(screen.getByText("Публичные тир-листы")).toBeDefined()
  })

  it("должен отобразить сообщение если нет тир-листов", async () => {
    vi.mocked(userApiModule.apiGetUserTierLists).mockResolvedValue({
      data: [],
      meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
    })
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText("Нет публичных тир-листов")).toBeDefined()
    })
  })

  it("должен отобразить ошибку если пользователь не найден", async () => {
    vi.mocked(userApiModule.apiGetPublicUser).mockRejectedValue(new Error("Пользователь не найден"))
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText("Пользователь не найден")).toBeDefined()
    })
  })

  it("должен отобразить кнопку Назад", async () => {
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText("Назад")).toBeDefined()
    })
  })

  it("должен отобразить статистику", async () => {
    renderWithRoute("2")

    await waitFor(() => {
      expect(screen.getByText("9")).toBeDefined()
    })
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("18")).toBeDefined()
  })
})
