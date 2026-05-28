import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { DiscussionSection } from "./DiscussionSection"

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { userId: 1, username: "testuser", role: "user" },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })),
}))

import * as authModule from "@/hooks/useAuthContext"

vi.mock("@/lib/discussionApi", () => ({
  getDiscussionByBattle: vi.fn(),
  getGeneralDiscussion: vi.fn(),
  getDiscussionById: vi.fn(),
  createDiscussion: vi.fn(),
  createMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))

import * as discussionApi from "@/lib/discussionApi"

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const mockMessages = [
  {
    id: "msg-1",
    content: "First message",
    userId: 1,
    discussionId: "d-1",
    parentId: null,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
    user: { id: 1, username: "testuser", avatarUrl: null, role: { name: "user" } },
    parent: null,
    replies: [],
  },
  {
    id: "msg-2",
    content: "Second message",
    userId: 2,
    discussionId: "d-1",
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: { id: 2, username: "other", avatarUrl: null, role: { name: "user" } },
    parent: null,
    replies: [],
  },
]

const mockDiscussion = {
  id: "d-1",
  title: "Test Discussion",
  type: "battle",
  battleId: "b-1",
  messages: mockMessages,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  author: null,
}

describe("DiscussionSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("должен показать загрузку при монтировании", () => {
    vi.mocked(discussionApi.getDiscussionByBattle).mockReturnValue(new Promise(() => {}))
    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("должен загрузить и отобразить сообщения (variant=battle)", async () => {
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      expect(screen.getByText("First message")).toBeInTheDocument()
    })
    expect(screen.getByText("Second message")).toBeInTheDocument()
    expect(screen.getByText("testuser")).toBeInTheDocument()
    expect(screen.getByText("other")).toBeInTheDocument()
  })

  it("должен показать пустое состояние когда нет сообщений", async () => {
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue({
      ...mockDiscussion,
      messages: [],
    } as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      expect(screen.getByText("Пока нет комментариев")).toBeInTheDocument()
    })
  })

  it("должен показать заголовок variant=battle как Комментарии", async () => {
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      expect(screen.getByText("Комментарии")).toBeInTheDocument()
    })
  })

  it("должен показать variant=general как Обсуждение", async () => {
    vi.mocked(discussionApi.getGeneralDiscussion).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="general" />)

    await waitFor(() => {
      expect(screen.getByText("Обсуждение")).toBeInTheDocument()
    })
  })

  it("должен отправить сообщение (variant=battle с созданием discussion)", async () => {
    const user = userEvent.setup()
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(null as any)
    vi.mocked(discussionApi.createDiscussion).mockResolvedValue(mockDiscussion as any)
    vi.mocked(discussionApi.createMessage).mockResolvedValue(mockMessages[0] as any)
    vi.mocked(discussionApi.getDiscussionById).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      expect(screen.getByText("Пока нет комментариев")).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText("Написать сообщение...")
    await user.type(textarea, "New message")
    await user.keyboard("{Enter}")

    await waitFor(() => {
      expect(discussionApi.createDiscussion).toHaveBeenCalledWith("b-1")
      expect(discussionApi.createMessage).toHaveBeenCalledWith("d-1", "New message", undefined)
    })
  })

  it("должен отправить сообщение в существующее обсуждение", async () => {
    const user = userEvent.setup()
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(mockDiscussion as any)
    vi.mocked(discussionApi.createMessage).mockResolvedValue(mockMessages[0] as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      expect(screen.getByText("First message")).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText("Написать сообщение...")
    await user.type(textarea, "Another message")
    await user.keyboard("{Enter}")

    await waitFor(() => {
      expect(discussionApi.createMessage).toHaveBeenCalledWith("d-1", "Another message", undefined)
    })
  })

  it("должен показать кнопку назад если есть onBack", async () => {
    const onBack = vi.fn()
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" onBack={onBack} />)

    await waitFor(() => {
      expect(screen.getByTitle("Назад к списку")).toBeInTheDocument()
    })
  })

  it("должен редактировать своё сообщение", async () => {
    const user = userEvent.setup()
    vi.mocked(discussionApi.getDiscussionById).mockResolvedValue(mockDiscussion as any)
    vi.mocked(discussionApi.updateMessage).mockResolvedValue(mockMessages[0] as any)

    const { container } = renderWithRouter(<DiscussionSection variant="topic" discussionId="d-1" />)

    await waitFor(() => {
      expect(screen.getByText("First message")).toBeInTheDocument()
    })

    const editBtn = screen.getAllByTitle("Редактировать")[0]
    await user.click(editBtn)

    const editTextarea = screen.getByDisplayValue("First message")
    await user.clear(editTextarea)
    await user.type(editTextarea, "Edited message")

    const confirmBtn = container.querySelector(".edit-confirm") as HTMLElement
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(discussionApi.updateMessage).toHaveBeenCalledWith("d-1", "msg-1", "Edited message")
    })
  })

  it("должен удалить сообщение админом", async () => {
    vi.mocked(discussionApi.getDiscussionById).mockResolvedValue(mockDiscussion as any)
    const user = userEvent.setup()

      // Используем хук с ролью admin
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { userId: 1, username: "admin", role: "admin" },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })

    vi.mocked(discussionApi.deleteMessage).mockResolvedValue(undefined)
    vi.mocked(discussionApi.getDiscussionById).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="topic" discussionId="d-1" />)

    await waitFor(() => {
      expect(screen.getByText("First message")).toBeInTheDocument()
    })

    const deleteBtns = screen.getAllByTitle("Удалить")
    await user.click(deleteBtns[0])

    await waitFor(() => {
      expect(discussionApi.deleteMessage).toHaveBeenCalledWith("d-1", "msg-1")
    })
  })

  it("должен блокировать ввод для неавторизованных", async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })

    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        "Войдите, чтобы писать",
      ) as HTMLTextAreaElement
      expect(textarea.disabled).toBe(true)
    })
  })

  it("должен отображать loading state пока загружаются данные", () => {
    vi.mocked(discussionApi.getDiscussionByBattle).mockReturnValue(new Promise(() => {}))
    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
    expect(screen.getByText("Комментарии")).toBeInTheDocument()
  })

  it("должен корректно считать сообщения", async () => {
    vi.mocked(discussionApi.getDiscussionByBattle).mockResolvedValue(mockDiscussion as any)

    renderWithRouter(<DiscussionSection variant="battle" battleId="b-1" />)

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument()
    })
  })
})
