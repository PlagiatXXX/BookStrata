import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import BlogArticlePage from "./BlogArticlePage";

vi.mock("@/ui/Footer", () => ({ Footer: () => <div data-testid="mock-footer" /> }));

function renderPage(slug = "non-existent-article") {
  return render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <HelmetProvider>
        <Routes>
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
        </Routes>
      </HelmetProvider>
    </MemoryRouter>,
  );
}

describe("BlogArticlePage — обработка 404", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("несуществующий slug статьи → рендерит NotFoundPage (вместо Soft-404)", async () => {
    renderPage("non-existent-article");

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });
});
