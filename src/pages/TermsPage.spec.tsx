import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TermsPage from "./TermsPage";

describe("TermsPage", () => {
  it("содержит кликабельную ссылку mailto на bookstrata@mail.ru", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

    const mailLink = screen.getByRole("link", { name: /bookstrata@mail.ru/i });
    expect(mailLink).toBeInTheDocument();
    expect(mailLink).toHaveAttribute("href", "mailto:bookstrata@mail.ru");
  });
});
