import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthForm } from "./AuthForm";

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ loginWithData: vi.fn() }),
}));

vi.mock("@/lib/authApi", () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  setAuthToken: vi.fn(),
}));

function renderForm(initialEntry = "/") {
  return rtlRender(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthForm />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthForm", () => {
  it("подписывает поле логина как «Логин или email» (пользователи вводят почту)", () => {
    renderForm();

    expect(screen.getByLabelText(/логин или email/i)).toBeTruthy();
  });

  it("поле логина имеет autocomplete=username для менеджеров паролей", () => {
    renderForm();

    const input = screen.getByLabelText(/логин или email/i) as HTMLInputElement;
    expect(input.autocomplete).toBe("username");
  });

  it("в режиме регистрации поле подписывает «Логин» (email вводится отдельно)", () => {
    renderForm("/?mode=register");

    expect(screen.getByLabelText(/^логин \*/i)).toBeTruthy();
    expect(screen.queryByLabelText(/логин или email/i)).toBeNull();
  });
});
