import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BattleApplyModal } from "./BattleApplyModal"

vi.mock("@/lib/tierListApi", () => ({
  getUserTierLists: vi.fn(),
}))

vi.mock("@/lib/battlesApi", () => ({
  applyToBattle: vi.fn(),
}))

import { getUserTierLists } from "@/lib/tierListApi"
import { applyToBattle } from "@/lib/battlesApi"

const mockTierLists = [
  { id: "tl-1", title: "My Fantasy List", isPublic: true, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: "tl-2", title: "My Sci-Fi List", isPublic: false, createdAt: "2025-01-02", updatedAt: "2025-01-02" },
]

describe("BattleApplyModal", () => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()

  const defaultProps = {
    battleId: "battle-1",
    battleTitle: "Weekly Fantasy Battle",
    onClose,
    onSuccess,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserTierLists).mockResolvedValue({
      data: mockTierLists,
      meta: { totalItems: 2, itemCount: 2, itemsPerPage: 50, totalPages: 1, currentPage: 1 },
    })
  })

  it("должен рендерить модалку с заголовком битвы", async () => {
    render(<BattleApplyModal {...defaultProps} />)

    expect(screen.getByText("Подать заявку")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Weekly Fantasy Battle/)).toBeInTheDocument()
    })
  })

  it("должен показывать только публичные тир-листы", async () => {
    render(<BattleApplyModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })

    expect(screen.queryByText("My Sci-Fi List")).not.toBeInTheDocument()
  })

  it("должен показывать спиннер во время загрузки", () => {
    vi.mocked(getUserTierLists).mockImplementationOnce(() => new Promise(() => {}))
    render(<BattleApplyModal {...defaultProps} />)

    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("должен показывать сообщение об ошибке если нет тир-листов", async () => {
    vi.mocked(getUserTierLists).mockResolvedValueOnce({
      data: [],
      meta: { totalItems: 0, itemCount: 0, itemsPerPage: 50, totalPages: 0, currentPage: 1 },
    })
    render(<BattleApplyModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/У вас нет публичных тир-листов/)).toBeInTheDocument()
    })
  })

  it("должен отправить заявку при сабмите", async () => {
    vi.mocked(applyToBattle).mockResolvedValueOnce({} as any)
    const user = userEvent.setup()

    render(<BattleApplyModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole("combobox"), "tl-1")
    await user.click(screen.getByText("Отправить заявку"))

    await waitFor(() => {
      expect(applyToBattle).toHaveBeenCalledWith("battle-1", "tl-1", undefined)
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it("должен показывать состояние успеха после отправки", async () => {
    vi.mocked(applyToBattle).mockResolvedValueOnce({} as any)
    const user = userEvent.setup()

    render(<BattleApplyModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole("combobox"), "tl-1")
    await user.click(screen.getByText("Отправить заявку"))

    await waitFor(() => {
      expect(screen.getByText("Заявка отправлена!")).toBeInTheDocument()
    })
  })

  it("должен закрываться по кнопке закрытия", async () => {
    const user = userEvent.setup()
    render(<BattleApplyModal {...defaultProps} />)

    const buttons = screen.getAllByRole("button")
    await user.click(buttons[0])

    expect(onClose).toHaveBeenCalled()
  })

  it("должен показывать ошибку при неудачной отправке", async () => {
    vi.mocked(applyToBattle).mockRejectedValueOnce(new Error("Участник уже в битве"))
    const user = userEvent.setup()

    render(<BattleApplyModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole("combobox"), "tl-1")
    await user.click(screen.getByText("Отправить заявку"))

    await waitFor(() => {
      expect(screen.getByText("Участник уже в битве")).toBeInTheDocument()
    })
  })
})
