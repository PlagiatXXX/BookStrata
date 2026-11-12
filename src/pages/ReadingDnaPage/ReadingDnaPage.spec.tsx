import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReadingDnaPage from "./ReadingDnaPage";

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/components/SEO/Breadcrumbs", () => ({
  Breadcrumbs: () => null,
}));

function renderPage(initialRoute = "/reading-dna") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ReadingDnaPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ReadingDnaPage", () => {
  it("отображает заголовок «Книжный ДНК», бейдж тайного общества и 4 касты", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /Книжный ДНК/i })).toBeInTheDocument();
    expect(screen.getByText(/Тайное книжное общество/i)).toBeInTheDocument();
    expect(screen.getByText("Орден Разума")).toBeInTheDocument();
    expect(screen.getByText("Орден Бездны")).toBeInTheDocument();
    expect(screen.getByText("Орден Действия")).toBeInTheDocument();
    expect(screen.getByText("Орден Света")).toBeInTheDocument();
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

  it("по клику на «Пройти тест вкуса» переходит к пошаговому опросу", async () => {
    const user = userEvent.setup();
    renderPage();

    const startBtn = screen.getByRole("button", { name: /Пройти тест вкуса/i });
    expect(startBtn).toBeInTheDocument();

    await user.click(startBtn);
    expect(screen.getByText(/3 Книги-Святыни/i)).toBeInTheDocument();
  });
});
