// src/pages/RankingsPage/components/GenreNavigation.spec.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GenreNavigation } from "./GenreNavigation";

describe("GenreNavigation — вход на хаб коллекций", () => {
  it("под каруселью жанров есть кнопка «Все коллекции» на /collections", () => {
    render(
      <MemoryRouter>
        <GenreNavigation />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Все коллекции/ });
    expect(link).toHaveProperty("href", expect.stringContaining("/collections"));
  });
});
