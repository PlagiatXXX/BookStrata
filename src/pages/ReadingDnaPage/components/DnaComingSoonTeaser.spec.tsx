import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DnaComingSoonTeaser } from "./DnaComingSoonTeaser";

function renderTeaser() {
  return render(
    <MemoryRouter>
      <DnaComingSoonTeaser />
    </MemoryRouter>
  );
}

describe("DnaComingSoonTeaser", () => {
  it("отображает заголовок, бейдж статуса и описание спецпроекта", () => {
    renderTeaser();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Книжный ДНК: узнайте свою читательскую формулу/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/Спецпроект BookStrata · Скоро открытие/i)).toBeInTheDocument();
    expect(screen.getByText(/закрытое тестирование/i)).toBeInTheDocument();
  });

  it("отображает 4 ключевых анонса возможностей спецпроекта", () => {
    renderTeaser();

    expect(screen.getByText("6 дилемм вкуса")).toBeInTheDocument();
    expect(screen.getByText("16 редких архетипов")).toBeInTheDocument();
    expect(screen.getByText("Литературная дуэль")).toBeInTheDocument();
    expect(screen.getByText("Винтажный читательский билет")).toBeInTheDocument();
  });

  it("содержит навигационные ссылки на главную и в каталог тир-листов", () => {
    renderTeaser();

    const homeLinks = screen.getAllByRole("link", { name: /На главную/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks[0]).toHaveAttribute("href", "/");

    const listsLink = screen.getByRole("link", { name: /Смотреть рейтинги/i });
    expect(listsLink).toHaveAttribute("href", "/tier-lists");
  });
});
