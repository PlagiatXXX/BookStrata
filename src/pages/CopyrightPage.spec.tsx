import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CopyrightPage from "./CopyrightPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CopyrightPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит основной заголовок и ключевые правовые разделы", () => {
    render(
      <MemoryRouter>
        <CopyrightPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /Информация для правообладателей/i })
    ).toBeInTheDocument();

    expect(screen.getAllByText(/1274 ГК РФ/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/1253\.1 ГК РФ/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/48 часов/)[0]).toBeInTheDocument();
  });

  it("содержит кликабельную ссылку mailto на bookstrata@mail.ru", () => {
    render(
      <MemoryRouter>
        <CopyrightPage />
      </MemoryRouter>
    );

    const mailLink = screen.getByRole("link", { name: /bookstrata@mail.ru/i });
    expect(mailLink).toHaveAttribute(
      "href",
      "mailto:bookstrata@mail.ru?subject=%D0%9E%D0%B1%D1%80%D0%B0%D1%89%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D0%BE%D0%B1%D0%BB%D0%B0%D0%B4%D0%B0%D1%82%D0%B5%D0%BB%D1%8F"
    );
  });

  it("копирует email в буфер обмена при нажатии на кнопку", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(
      <MemoryRouter>
        <CopyrightPage />
      </MemoryRouter>
    );

    const copyBtn = screen.getByRole("button", { name: /копировать email/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("bookstrata@mail.ru");
    expect(await screen.findByText(/скопировано/i)).toBeInTheDocument();
  });
});
