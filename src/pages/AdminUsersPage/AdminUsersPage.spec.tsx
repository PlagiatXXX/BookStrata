import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { AdminUsersPage } from "./AdminUsersPage"

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { useAuth } from "@/hooks/useAuthContext"
import { api } from "@/lib/api-client"

const mockUsers = [
  {
    userId: 1,
    email: "admin@test.com",
    username: "admin",
    isPro: true,
    proExpiresAt: "2026-12-31T00:00:00Z",
    role: "admin",
    createdAt: "2024-01-15T00:00:00Z",
  },
  {
    userId: 2,
    email: "moderator@test.com",
    username: "moderator_user",
    isPro: false,
    proExpiresAt: null,
    role: "moderator",
    createdAt: "2024-03-20T00:00:00Z",
  },
  {
    userId: 3,
    email: "user@test.com",
    username: "regular_user",
    isPro: false,
    proExpiresAt: null,
    role: "user",
    createdAt: "2024-06-10T00:00:00Z",
  },
]

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

describe("AdminUsersPage", () => {
  const navigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "admin", role: "admin" },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any)
    vi.mocked(api.get).mockResolvedValue(mockUsers)
  })

  it("должен рендерить заголовок страницы", async () => {
    render(<AdminUsersPage />, { wrapper: createWrapper() })

    expect(screen.getByText("Управление пользователями")).toBeInTheDocument()
  })

  it("должен отображать список пользователей", async () => {
    render(<AdminUsersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument()
    })
    expect(screen.getByText("moderator_user")).toBeInTheDocument()
    expect(screen.getByText("regular_user")).toBeInTheDocument()
  })

  it("должен фильтровать по ролям", async () => {
    render(<AdminUsersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText("Модераторы"))

    expect(screen.queryByText("admin")).not.toBeInTheDocument()
    expect(screen.getByText("moderator_user")).toBeInTheDocument()
  })

  it("должен искать пользователей", async () => {
    render(<AdminUsersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Поиск по имени или email/)
    await userEvent.type(searchInput, "moderator")

    expect(screen.queryByText("admin")).not.toBeInTheDocument()
    expect(screen.getByText("moderator_user")).toBeInTheDocument()
  })

  it("должен показывать \"Это вы\" для текущего пользователя", async () => {
    render(<AdminUsersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("Это вы")).toBeInTheDocument()
    })
  })

  it("должен отображать количество пользователей", async () => {
    render(<AdminUsersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Всего пользователей: 3/)).toBeInTheDocument()
    })
  })
})
