import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HubSection } from "./HubSection";

describe("HubSection", () => {
  it("рендерит 6 карточек-порталов разделов платформы", () => {
    render(
      <MemoryRouter>
        <HubSection theme="light" />
      </MemoryRouter>
    );

    expect(screen.getByText("Создать тир-лист в 1 клик")).toBeInTheDocument();
    expect(screen.getByText("Книжные рейтинги")).toBeInTheDocument();
    expect(screen.getByText("Что читают знаменитости")).toBeInTheDocument();
    expect(screen.getByText("Каталог авторов")).toBeInTheDocument();
    expect(screen.getByText("Литературный блог")).toBeInTheDocument();
    expect(screen.getByText("Частые вопросы")).toBeInTheDocument();
  });
});
