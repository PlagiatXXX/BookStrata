import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CuratorApplyModal } from "./CuratorApplyModal"

vi.mock("@/lib/tierListApi", () => ({
  getUserTierLists: vi.fn(),
}))

vi.mock("@/lib/battlesApi", () => ({
  applyGeneral: vi.fn(),
}))

import { getUserTierLists } from "@/lib/tierListApi"
import { applyGeneral } from "@/lib/battlesApi"

describe("CuratorApplyModal", () => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserTierLists).mockResolvedValue({
      data: [
        { id: "tl-1", title: "My Fantasy List", isPublic: true, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
        { id: "tl-2", title: "My Sci-Fi List", isPublic: true, createdAt: "2025-01-02", updatedAt: "2025-01-02" },
      ],
      meta: { totalItems: 2, itemCount: 2, itemsPerPage: 50, totalPages: 1, currentPage: 1 },
    })
  })

  it("должен рендерить модалку с заголовком", () => {
    render(<CuratorApplyModal onClose={onClose} onSuccess={onSuccess} />)

    expect(screen.getByText("Подать заявку на участие")).toBeInTheDocument()
  })

  it("должен загрузить и отобразить тир-листы", async () => {
    render(<CuratorApplyModal onClose={onClose} onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })
    expect(screen.getByText("My Sci-Fi List")).toBeInTheDocument()
  })

  it("должен отправить общую заявку", async () => {
    vi.mocked(applyGeneral).mockResolvedValueOnce({} as any)
    const user = userEvent.setup()

    render(<CuratorApplyModal onClose={onClose} onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole("combobox"), "tl-1")
    await user.click(screen.getByText("Отправить заявку"))

    await waitFor(() => {
      expect(applyGeneral).toHaveBeenCalledWith("tl-1", undefined)
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it("должен показывать успех после отправки", async () => {
    vi.mocked(applyGeneral).mockResolvedValueOnce({} as any)
    const user = userEvent.setup()

    render(<CuratorApplyModal onClose={onClose} onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(screen.getByText("My Fantasy List")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole("combobox"), "tl-1")
    await user.click(screen.getByText("Отправить заявку"))

    await waitFor(() => {
      expect(screen.getByText("Заявка отправлена!")).toBeInTheDocument()
    })
  })

  it("должен закрываться по кнопке Отмена", async () => {
    const user = userEvent.setup()
    render(<CuratorApplyModal onClose={onClose} onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(screen.getByText("Отмена")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Отмена"))

    expect(onClose).toHaveBeenCalled()
  })
})
