import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ReadingDnaPage from "./ReadingDnaPage";

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/components/SEO/Breadcrumbs", () => ({
  Breadcrumbs: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/reading-dna"]}>
      <ReadingDnaPage />
    </MemoryRouter>,
  );
}

describe("ReadingDnaPage", () => {
  it("отображает заголовок «Книжный ДНК» и бейдж тайного общества", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /Книжный ДНК/i })).toBeInTheDocument();
    expect(screen.getByText(/Тайное книжное общество/i)).toBeInTheDocument();
  });

  it("позволяет переключать атмосферу через анимированную кнопку без текста", async () => {
    const user = userEvent.setup();
    renderPage();

    const toggleBtn = screen.getByRole("button", { name: /Переключить на крафтовую анкету/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("☀️");

    await user.click(toggleBtn);
    const moonBtn = screen.getByRole("button", { name: /Переключить на ночной архив/i });
    expect(moonBtn).toBeInTheDocument();
    expect(moonBtn).toHaveTextContent("🌙");

    await user.click(moonBtn);
    expect(screen.getByRole("button", { name: /Переключить на крафтовую анкету/i })).toHaveTextContent("☀️");
  });
});
