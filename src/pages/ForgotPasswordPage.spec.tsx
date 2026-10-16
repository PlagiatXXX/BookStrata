// Восстановление пароля идёт вручную: SMTP сайта лежит, а форма при сбое
// отправки не оставляла человеку ни письма, ни рабочей ссылки.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPasswordPage from "./ForgotPasswordPage";

vi.mock("@/components/SEO/SEOHead", () => ({ SEOHead: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );

describe("ForgotPasswordPage — ручное восстановление через Telegram", () => {
  it("ведёт за временным паролем в Telegram вместо формы с email", () => {
    renderPage();

    const telegram = screen.getByRole("link", { name: /Telegram/i });
    expect(telegram).toHaveProperty("href", "https://t.me/PasFedor");
    // Формы ввода больше нет — запрос уходит человеку, а не в молчащий SMTP
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("предупреждает, что пароль уходит только на почту аккаунта", () => {
    renderPage();

    expect(screen.getByText(/только на почту/i)).toBeTruthy();
  });

  it("оставляет путь назад ко входу", () => {
    renderPage();

    const backToLogin = screen.getByRole("link", { name: /Войти/i });
    expect(backToLogin).toHaveProperty("href", expect.stringContaining("/auth"));
  });
});
