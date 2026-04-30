import { render, screen } from "@testing-library/react";
import { LibraryPage } from "./LibraryPage";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

// Mock Header and Footer as they might depend on complex contexts
vi.mock("@/ui/Header", () => ({
  Header: () => <header data-testid="header" />
}));
vi.mock("@/ui/Footer", () => ({
  Footer: () => <footer data-testid="footer" />
}));

describe("LibraryPage", () => {
  it("renders the library page with heading and scene", () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/ВАША ЦИФРОВАЯ/i)).toBeInTheDocument();
    expect(screen.getByText(/БИБЛИОТЕКА/i)).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Организация")).toBeInTheDocument();
    expect(screen.getByText("Визуализация")).toBeInTheDocument();
    expect(screen.getByText("Сообщество")).toBeInTheDocument();
  });
});
