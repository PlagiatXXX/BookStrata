import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ModerationPanel } from "./ModerationPanel"
import { MemoryRouter } from "react-router-dom"

const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/lib/moderationApi", () => ({
  apiGetModerationStatus: vi.fn(),
  apiBanChat: vi.fn(),
  apiUnbanChat: vi.fn(),
  apiSuspend: vi.fn(),
  apiUnsuspend: vi.fn(),
  apiWarn: vi.fn(),
  apiGetWarnings: vi.fn(),
  apiChangeRole: vi.fn(),
}))

vi.mock("sileo", () => ({ sileo: { success: vi.fn(), error: vi.fn() } }))

import * as moderationApi from "@/lib/moderationApi"

function renderPanel(props: Partial<React.ComponentProps<typeof ModerationPanel>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ModerationPanel userId={1} username="testuser" currentRole="user" {...props} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const defaultStatus = {
  id: 1,
  username: "testuser",
  role: "user",
  chatBanned: false,
  chatBannedAt: null,
  chatBannedUntil: null,
  suspended: false,
  suspendedAt: null,
  suspendedUntil: null,
  suspensionReason: null,
  warningsCount: 0,
}

describe("ModerationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { userId: 1, username: "admin", role: "admin" },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })
    ;(moderationApi.apiGetModerationStatus as any).mockResolvedValue(defaultStatus)
    ;(moderationApi.apiGetWarnings as any).mockResolvedValue([])
  })

  it("должен рендерить панель модератора", async () => {
    renderPanel()

    expect(screen.getByText("Панель модератора")).toBeInTheDocument()
  })

  it("должен показывать кнопку Забанить чат когда чат не забанен", async () => {
    renderPanel()

    await waitFor(() => {
      expect(screen.getByText("Забанить чат")).toBeInTheDocument()
    })
  })

  it("должен показывать кнопку Разбанить чат когда чат забанен", async () => {
    ;(moderationApi.apiGetModerationStatus as any).mockResolvedValue({
      ...defaultStatus,
      chatBanned: true,
      chatBannedAt: new Date().toISOString(),
      chatBannedUntil: null,
    })

    renderPanel()

    await waitFor(() => {
      expect(screen.getByText("Разбанить чат")).toBeInTheDocument()
    })
  })

  it("должен показывать бейдж Чат забанен навсегда при перманентном бане", async () => {
    ;(moderationApi.apiGetModerationStatus as any).mockResolvedValue({
      ...defaultStatus,
      chatBanned: true,
      chatBannedAt: new Date().toISOString(),
      chatBannedUntil: null,
    })

    renderPanel()

    await waitFor(() => {
      expect(screen.getByText(/навсегда/)).toBeInTheDocument()
    })
  })

  it("должен показывать кнопку Заблокировать для админа", async () => {
    renderPanel()

    await waitFor(() => {
      expect(screen.getByText("Заблокировать")).toBeInTheDocument()
    })
  })
})

describe("ModerationPanel — moderator role", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { userId: 2, username: "mod", role: "moderator" },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })
    ;(moderationApi.apiGetModerationStatus as any).mockResolvedValue(defaultStatus)
    ;(moderationApi.apiGetWarnings as any).mockResolvedValue([])
  })

  it("должен скрывать Заблокировать для модератора", async () => {
    renderPanel()

    await waitFor(() => {
      expect(screen.queryByText("Заблокировать")).not.toBeInTheDocument()
    })
  })
})
