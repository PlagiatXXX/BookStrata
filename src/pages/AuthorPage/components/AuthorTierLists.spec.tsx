// src/pages/AuthorPage/components/AuthorTierLists.spec.tsx
// Плитки «В тир-листах»: ссылка на тир-лист + кликабельный ник владельца.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthorTierLists } from "./AuthorTierLists";
import type { AuthorPageData } from "@/lib/authorsApi";

const lists: AuthorPageData["tierLists"] = [
  { id: "t1", slug: "tl-1", title: "Лучшее", userId: 42, username: "fan42" },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderLists() {
  return render(
    <MemoryRouter initialEntries={["/authors/lev-tolstoy"]}>
      <Routes>
        <Route path="/authors/:slug" element={<AuthorTierLists lists={lists} />} />
        {/* Ловушка для перехода на профиль владельца */}
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthorTierLists", () => {
  it("рендерит ник владельца ссылкой на его профиль", () => {
    renderLists();
    const nick = screen.getByRole("link", { name: "fan42" });
    expect(nick).toHaveAttribute("href", "/users/42");
  });

  it("название плитки ссылается на тир-лист", () => {
    renderLists();
    const title = screen.getByRole("link", { name: "Лучшее" });
    expect(title).toHaveAttribute("href", "/tier-lists/tl-1");
  });

  it("клик по нику ведёт на профиль владельца, а не на тир-лист", async () => {
    const user = userEvent.setup();
    renderLists();
    await user.click(screen.getByRole("link", { name: "fan42" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/users/42");
  });

  it("пустой список — секция не рендерится", () => {
    render(
      <MemoryRouter>
        <AuthorTierLists lists={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("В тир-листах")).not.toBeInTheDocument();
  });
});
