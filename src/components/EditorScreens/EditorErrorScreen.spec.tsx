import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EditorErrorScreen } from "./EditorErrorScreen";
import { ApiRequestError } from "@/lib/api-client";

// Мокаем DashboardLayout, чтобы изолировать тест от провайдеров Auth / Router / Search
vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

describe("EditorErrorScreen", () => {
  it("отображает заголовок и сообщение для приватного тир-листа (403)", () => {
    const error = new ApiRequestError(
      "ACCESS_DENIED",
      "Доступ ограничен автором. Этот материал является приватным",
      403,
    );

    render(
      <MemoryRouter>
        <EditorErrorScreen error={error} onMyRatingsClick={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Приватный тир-лист",
    );
    expect(
      screen.getByText(
        "Автор ограничил доступ к этому тир-листу. Если это ваш список, пожалуйста, войдите в свой аккаунт.",
      ),
    ).toBeInTheDocument();
  });

  it("отображает сообщение для несуществующего тир-листа (404)", () => {
    const error = new ApiRequestError("NOT_FOUND", "Не найдено", 404);

    render(
      <MemoryRouter>
        <EditorErrorScreen error={error} onMyRatingsClick={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Тир-лист не найден",
    );
  });

  it("отображает кнопку возврата на главную и вызова onMyRatingsClick", () => {
    const error = new Error("Кастомная ошибка");
    const onMyRatingsClick = vi.fn();

    render(
      <MemoryRouter>
        <EditorErrorScreen error={error} onMyRatingsClick={onMyRatingsClick} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Кастомная ошибка")).toBeInTheDocument();
    expect(screen.getByText("Мои тир-листы")).toBeInTheDocument();
    expect(screen.getByText("На главную")).toBeInTheDocument();
  });
});
