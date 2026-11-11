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

  it("контейнер формы использует min-h-dvh для корректной высоты на мобильных устройствах", () => {
    const { container } = renderForm();
    const rootDiv = container.firstElementChild as HTMLElement;
    expect(rootDiv.className).toContain("min-h-dvh");
  });

  it("в режиме входа не требует пароль длиннее 6 символов", async () => {
    const { fireEvent } = await import("@testing-library/react");
    renderForm("/?mode=login");

    const passwordInput = screen.getByLabelText(/^пароль/i, { selector: "input" });
    fireEvent.change(passwordInput, { target: { value: "123" } });

    expect(screen.queryByText(/минимум/i)).toBeNull();
  });

  it("в режиме регистрации требует минимум 6 символов", async () => {
    const { fireEvent } = await import("@testing-library/react");
    renderForm("/?mode=register");

    const passwordInput = screen.getByLabelText(/^пароль/i, { selector: "input" });
    fireEvent.change(passwordInput, { target: { value: "12345" } });

    expect(screen.getByText("Минимум 6 символов")).toBeTruthy();

    fireEvent.change(passwordInput, { target: { value: "123456" } });
    expect(screen.queryByText("Минимум 6 символов")).toBeNull();
  });

  it("в режиме регистрации нет чекбокса, условия отображаются текстом со ссылками", () => {
    renderForm("/?mode=register");

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText(/условия использования/i)).toBeTruthy();
    expect(screen.getByText(/политик[еу] конфиденциальности/i)).toBeTruthy();
  });

  it("при отправке формы регистрации передает acceptedTerms: true", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const { apiRegister } = await import("@/lib/authApi");
    vi.mocked(apiRegister).mockResolvedValueOnce({
      accessToken: "token123",
      userId: 1,
      username: "newuser",
    });

    renderForm("/?mode=register");

    const usernameInput = screen.getByLabelText(/^логин/i, { selector: "input" });
    const emailInput = screen.getByLabelText(/^email/i, { selector: "input" });
    const passwordInput = screen.getByLabelText(/^пароль/i, { selector: "input" });

    fireEvent.change(usernameInput, { target: { value: "newuser" } });
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const submitBtn = screen.getByRole("button", { name: "Зарегистрироваться" });
    fireEvent.click(submitBtn);

    expect(apiRegister).toHaveBeenCalledWith({
      username: "newuser",
      email: "user@example.com",
      password: "password123",
      acceptedTerms: true,
    });
  });
});
