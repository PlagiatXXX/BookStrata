import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReadingDnaPage from "./ReadingDnaPage";

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

function renderPage(initialRoute = "/reading-dna") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
  it("отображает заголовок, навигационные вкладки и переключает архивные документы по клику на вкладку", async () => {
    const user = userEvent.setup();
    renderPage();

    // Заголовок и навигация
    expect(screen.getByRole("heading", { name: /Книжный ДНК/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Главная/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Назад/i }).length).toBeGreaterThan(0);
    const testTab = screen.getByRole("button", { name: /Тест/i });
    const ticketTab = screen.getByRole("button", { name: /Билет/i });
    const duelTab = screen.getByRole("button", { name: /Дуэль/i });
    const hubTab = screen.getByRole("button", { name: /Витрина/i });

    expect(testTab).toBeInTheDocument();
    expect(ticketTab).toBeInTheDocument();
    expect(duelTab).toBeInTheDocument();
    expect(hubTab).toBeInTheDocument();

    // По умолчанию открыт Документ I (Тест), остальные скрыты
    expect(screen.getByText(/Документ I — Анкета читателя/i)).toBeInTheDocument();
    expect(screen.queryByText(/Документ II — Читательский билет/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Документ III — Слепая дуэль/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Документ IV — Витрина/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Что держит вас у страницы\?/i)).toBeInTheDocument();

    // Переключаемся на Билет
    await user.click(ticketTab);
    expect(await screen.findByText(/Документ II — Читательский билет/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Документ I — Анкета читателя/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Бланк пуст/i)).toBeInTheDocument();

    // Переключаемся на Дуэль
    await user.click(duelTab);
    expect(await screen.findByText(/Документ III — Слепая дуэль/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Документ II — Читательский билет/i)).not.toBeInTheDocument();
    });

    // Переключаемся на Витрину
    await user.click(hubTab);
    expect(await screen.findByText(/Документ IV — Витрина/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Документ III — Слепая дуэль/i)).not.toBeInTheDocument();
    });

    // Возвращаемся обратно на Тест
    await user.click(testTab);
    expect(await screen.findByText(/Документ I — Анкета читателя/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Документ IV — Витрина/i)).not.toBeInTheDocument();
    });
  });

  it("по умолчанию загружается светлая крафтовая тема и позволяет переключать тему по кнопке", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderPage();

    // По умолчанию светлая тема: видна кнопка перехода на ночной архив 🌙
    const moonBtn = screen.getByRole("button", { name: /Переключить на ночной архив/i });
    expect(moonBtn).toBeInTheDocument();
    expect(moonBtn).toHaveTextContent("🌙");

    await user.click(moonBtn);
    const sunBtn = screen.getByRole("button", { name: /Переключить на крафтовую анкету/i });
    expect(sunBtn).toBeInTheDocument();
    expect(sunBtn).toHaveTextContent("☀️");

    await user.click(sunBtn);
    expect(screen.getByRole("button", { name: /Переключить на ночной архив/i })).toHaveTextContent("🌙");
  });

  it("сохраняет тему в localStorage и считывает её при входе", async () => {
    const user = userEvent.setup();
    localStorage.clear();

    const { unmount } = renderPage();
    const moonBtn = screen.getByRole("button", { name: /Переключить на ночной архив/i });
    await user.click(moonBtn);

    expect(localStorage.getItem("bs_reading_dna_theme")).toBe("dark");
    unmount();

    // При повторном рендере должна восстановиться ночная тема (кнопка ☀️ для перехода в крафтовую)
    renderPage();
    expect(screen.getByRole("button", { name: /Переключить на крафтовую анкету/i })).toBeInTheDocument();
  });

  it("восстанавливает сохранённый черновик теста из localStorage при входе", () => {
    localStorage.setItem(
      "bs_reading_dna_draft",
      JSON.stringify({
        step: 6,
        axes: { storyFocus: 85, emotionalWeight: 70, pace: 40, darkness: 90, scope: 60, complexity: 75 },
        favoriteBooks: [{ title: "Имя розы", author: "Умберто Эко" }],
        kryptonite: null,
      })
    );

    renderPage();

    // Должен сразу открыться 7-й шаг (Печать: ваши книги), т.к. step=6 сохранен
    expect(screen.getByText(/Печать: ваши книги/i)).toBeInTheDocument();
    expect(screen.getAllByText("Имя розы").length).toBeGreaterThan(0);
    expect(screen.getByText(/Начать заново/i)).toBeInTheDocument();
  });

  it("по умолчанию оси стоят на 0 и кнопка «Дальше» заблокирована, пока пользователь не взаимодействует", () => {
    localStorage.clear();
    renderPage();

    const nextBtn = screen.getByRole("button", { name: /Дальше/i });
    expect(nextBtn).toBeDisabled();

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });
});
