import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPage from "./PrivacyPage";

describe("PrivacyPage", () => {
  it("содержит ссылки mailto на bookstrata@mail.ru", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    );

    const mailLinks = screen.getAllByRole("link", { name: /bookstrata@mail.ru/i });
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
    expect(mailLinks[0]).toHaveAttribute("href", "mailto:bookstrata@mail.ru");
  });
});
