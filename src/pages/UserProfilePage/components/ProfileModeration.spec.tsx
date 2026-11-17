/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileModeration } from "./ProfileModeration"
import { useAuth } from "@/hooks/useAuthContext"

vi.mock("@/hooks/useAuthContext", () => ({ useAuth: vi.fn() }))
vi.mock("@/components/ModerationPanel/ModerationPanel", () => ({
  ModerationPanel: (props: {
    userId: number
    username: string
    currentRole: string
  }) => (
    <div
      data-testid="moderation-panel"
      data-user-id={props.userId}
      data-username={props.username}
      data-role={props.currentRole}
    />
  ),
}))

function mockViewer(viewer: { userId: number; role: string } | null) {
  vi.mocked(useAuth).mockReturnValue({ user: viewer } as never)
}

describe("ProfileModeration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("админу на чужом профиле показывает «Управление» и раскрывает панель", () => {
    mockViewer({ userId: 1, role: "admin" })
    render(
      <ProfileModeration userId={2} username="other" currentRole="user" />,
    )

    const button = screen.getByRole("button", { name: "Управление" })
    expect(screen.queryByTestId("moderation-panel")).not.toBeInTheDocument()

    fireEvent.click(button)

    const panel = screen.getByTestId("moderation-panel")
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute("data-user-id", "2")
    expect(panel).toHaveAttribute("data-username", "other")
    expect(panel).toHaveAttribute("data-role", "user")
  })

  it("модератору на чужом профиле кнопка показывается", () => {
    mockViewer({ userId: 1, role: "moderator" })
    render(
      <ProfileModeration userId={2} username="other" currentRole="user" />,
    )

    expect(
      screen.getByRole("button", { name: "Управление" }),
    ).toBeInTheDocument()
  })

  it("обычному посетителю кнопку не показывает", () => {
    mockViewer({ userId: 3, role: "user" })
    render(
      <ProfileModeration userId={2} username="other" currentRole="user" />,
    )

    expect(
      screen.queryByRole("button", { name: "Управление" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId("moderation-panel")).not.toBeInTheDocument()
  })

  it("на своём профиле кнопки нет даже у staff", () => {
    mockViewer({ userId: 2, role: "admin" })
    render(
      <ProfileModeration userId={2} username="self" currentRole="admin" />,
    )

    expect(
      screen.queryByRole("button", { name: "Управление" }),
    ).not.toBeInTheDocument()
  })

  it("гостю кнопки нет", () => {
    mockViewer(null)
    render(
      <ProfileModeration userId={2} username="other" currentRole="user" />,
    )

    expect(
      screen.queryByRole("button", { name: "Управление" }),
    ).not.toBeInTheDocument()
  })

  it("повторный клик сворачивает панель", () => {
    mockViewer({ userId: 1, role: "admin" })
    render(
      <ProfileModeration userId={2} username="other" currentRole="user" />,
    )

    const button = screen.getByRole("button", { name: "Управление" })
    fireEvent.click(button)
    expect(screen.getByTestId("moderation-panel")).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.queryByTestId("moderation-panel")).not.toBeInTheDocument()
  })
})
