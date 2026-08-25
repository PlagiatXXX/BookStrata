import { describe, it, expect } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Footer } from "./Footer";

function renderFooter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Footer", () => {
  it("содержит ссылку на /pricing (страница не должна быть сиротой для поисковиков)", () => {
    renderFooter();

    const link = screen.getByRole("link", { name: /Поддержать проект/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });
});
