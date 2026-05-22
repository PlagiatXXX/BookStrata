import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import AdminBattlesPage from "./AdminBattlesPage"

vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { api } from "@/lib/api-client"

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

describe("AdminBattlesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === "/battles/applications/pending") {
        return [
          {
            id: 1,
            battleId: null,
            userId: 2,
            tierListId: "tl-1",
            message: "I want to join!",
            status: "pending",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            user: { id: 2, username: "battle_fan" },
            tierList: { id: "tl-1", title: "My Awesome List", isPublic: true },
          },
          {
            id: 2,
            battleId: null,
            userId: 3,
            tierListId: "tl-2",
            message: null,
            status: "pending",
            createdAt: "2025-01-02T00:00:00Z",
            updatedAt: "2025-01-02T00:00:00Z",
            user: { id: 3, username: "another_user" },
            tierList: { id: "tl-2", title: "Another List", isPublic: true },
          },
        ]
      }
      if (url === "/battles/applications/approved") {
        return [
          {
            id: 3,
            battleId: null,
            userId: 4,
            tierListId: "tl-3",
            message: null,
            status: "approved",
            createdAt: "2025-01-03T00:00:00Z",
            updatedAt: "2025-01-03T00:00:00Z",
            user: { id: 4, username: "approved_user", avatarUrl: null },
            tierList: { id: "tl-3", title: "Approved List", isPublic: true },
          },
        ]
      }
      if (url === "/battles") {
        return [
          {
            id: "battle-1",
            title: "Active Battle",
            endTime: new Date(Date.now() + 86400000).toISOString(),
            participants: [{ id: 1 }],
          },
        ]
      }
      return []
    })
  })

  it("должен рендерить заголовок страницы", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    expect(screen.getByText("Управление битвами")).toBeInTheDocument()
  })

  it("должен отображать ожидающие заявки", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("battle_fan")).toBeInTheDocument()
    })
    expect(screen.getByText("another_user")).toBeInTheDocument()
  })

  it("должен отображать сообщение заявки", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/I want to join!/)).toBeInTheDocument()
    })
  })

  it("должен отображать принятые заявки", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("approved_user")).toBeInTheDocument()
    })
  })

  it("должен отображать активные битвы", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("Active Battle")).toBeInTheDocument()
    })
  })

  it("должен показывать счётчики заявок и битв", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Новые заявки \(2\)/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Принятые заявки \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Активные битвы \(1\)/)).toBeInTheDocument()
  })

  it("должен отображать ссылки на тир-листы в принятых заявках", async () => {
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("Approved List")).toBeInTheDocument()
    })
  })

  it("должен открывать модалку создания битвы", async () => {
    const user = userEvent.setup()
    render(<AdminBattlesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("Принятые заявки (1)")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Создать битву"))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Создать битву" })).toBeInTheDocument()
    })
  })
})
