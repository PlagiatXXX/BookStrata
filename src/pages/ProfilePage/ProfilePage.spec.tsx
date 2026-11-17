import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import ProfilePage from "./index"

const m = vi.hoisted(() => ({
  useAuth: vi.fn(),
}))

vi.mock("@/hooks/useAuthContext", () => ({ useAuth: m.useAuth }))

function renderProfilePage() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users/:id" element={<div data-testid="user-profile-page" />} />
        <Route path="/auth" element={<div data-testid="auth-page" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("ProfilePage — редирект на единую страницу профиля", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 42, username: "reader", role: "user" },
    })
  })

  it("при авторизации редиректит на /users/:id со своим userId", async () => {
    renderProfilePage()

    expect(await screen.findByTestId("user-profile-page")).toBeDefined()
  })

  it("неавторизованного пользователя оставляет на прежнем экране «войдите»", () => {
    m.useAuth.mockReturnValue({ isAuthenticated: false, user: null })
    renderProfilePage()

    expect(screen.getByText("Пожалуйста, войдите в систему")).toBeDefined()
    expect(screen.getByText("Перейти на страницу входа")).toBeDefined()
    expect(screen.queryByTestId("user-profile-page")).toBeNull()
  })
})
