import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReadingDnaPage from "./ReadingDnaPage";
import { AuthContext, type AuthContextType, type AuthUser } from "@/contexts/auth.context";
import * as readingDnaApi from "@/lib/readingDnaApi";

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

vi.mock("@/lib/gtm", () => ({
  pushDataLayerEvent: vi.fn(),
}));

vi.mock("@/lib/readingDnaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/readingDnaApi")>();
  return {
    ...actual,
    getReadingArchetypes: vi.fn().mockResolvedValue([]),
    getMyReadingDna: vi.fn().mockResolvedValue(null),
    getReadingTicket: vi.fn().mockResolvedValue(null),
    getReadingArchetypeStats: vi.fn().mockResolvedValue({
      totalTickets: 100,
      distribution: {},
    }),
    saveReadingDna: vi.fn(),
    conductReadingDuel: vi.fn(),
    shareReadingTicket: vi.fn(),
  };
});

function renderPage(
  initialRoute = "/reading-dna",
  authUser: AuthUser | null = { userId: 1, username: "admin", role: "ADMIN" }
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const authValue: AuthContextType = {
    user: authUser,
    isLoading: false,
    isAuthenticated: Boolean(authUser),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    loginWithData: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <ReadingDnaPage />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

describe("ReadingDnaPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Публичный доступ к Книжному ДНК", () => {
    it("отображает полноценный интерфейс для неавторизованного пользователя (гостя)", () => {
      renderPage("/reading-dna", null);

      expect(screen.getByRole("button", { name: /^Тест$/i })).toBeInTheDocument();
      expect(screen.queryByText(/Спецпроект BookStrata · Скоро открытие/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Режим администратора/i)).not.toBeInTheDocument();
    });

    it("отображает полноценный интерфейс для авторизованного обычного пользователя", () => {
      const normalUser: AuthUser = { userId: 42, username: "reader", role: "USER" };
      renderPage("/reading-dna", normalUser);

      expect(screen.getByRole("button", { name: /^Тест$/i })).toBeInTheDocument();
      expect(screen.queryByText(/Спецпроект BookStrata · Скоро открытие/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Режим администратора/i)).not.toBeInTheDocument();
    });

    it("отображает полноценный интерфейс без админ-плашки для роли ADMIN/admin", () => {
      const adminUser: AuthUser = { userId: 1, username: "admin", role: "admin" };
      renderPage("/reading-dna", adminUser);

      expect(screen.getByRole("button", { name: /^Тест$/i })).toBeInTheDocument();
      expect(screen.queryByText(/Режим администратора/i)).not.toBeInTheDocument();
    });
  });

  describe("Изоляция хранилища и защита от показа чужого билета", () => {
    it("авторизованный пользователь без ДНК в базе не видит чужой билет из устаревшего ключа localStorage", () => {
      // Имитируем старый ключ чужого админского билета
      localStorage.setItem(
        "bs_reading_dna_ticket",
        JSON.stringify({
          id: 99,
          ticketNumber: "BS-ADMIN-TICKET",
          customName: "Админский билет",
          archetype: "meaning-architect",
          archetypeName: "Архитектор смыслов",
          theme: "craft",
          axes: { storyFocus: 80, emotionalWeight: 50, pace: 50, darkness: 50, scope: 50, complexity: 50 },
          favoriteBooks: [],
          likedGenres: [],
          dislikedGenres: [],
          favoriteAuthors: [],
          viewsCount: 1,
        })
      );

      const adminWithoutDna: AuthUser = { userId: 2, username: "admin2", role: "ADMIN" };
      renderPage("/reading-dna", adminWithoutDna);

      // Старый неизолированный ключ должен быть очищен
      expect(localStorage.getItem("bs_reading_dna_ticket")).toBeNull();
      // Чужой билет не должен отображаться
      expect(screen.queryByText("BS-ADMIN-TICKET")).not.toBeInTheDocument();
      // По умолчанию открыта вкладка «О проекте»
      expect(screen.getByRole("button", { name: /^О проекте$/i })).toBeInTheDocument();
    });
  });

  describe("Основная функциональность", () => {
    it("отображает заголовок, навигационные вкладки и переключает архивные документы по клику на вкладку", async () => {
      const user = userEvent.setup();
      renderPage();

      // Заголовок и навигация
      expect(screen.getByRole("heading", { name: /Книжный ДНК: узнайте, какой вы читатель/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Главная/i })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Назад/i }).length).toBeGreaterThan(0);
      const aboutTab = screen.getByRole("button", { name: /^О проекте$/i });
      const testTab = screen.getByRole("button", { name: /^Тест$/i });
      const ticketTab = screen.getByRole("button", { name: /^Билет$/i });
      const duelTab = screen.getByRole("button", { name: /^Сравнение$/i });
      const hubTab = screen.getByRole("button", { name: /^Витрина$/i });

      expect(aboutTab).toBeInTheDocument();
      expect(testTab).toBeInTheDocument();
      expect(ticketTab).toBeInTheDocument();
      expect(duelTab).toBeInTheDocument();
      expect(hubTab).toBeInTheDocument();

      // По умолчанию открыт промо-лендинг «О проекте»
      expect(screen.getByText(/Расшифруйте свой литературный вкус по 6 осям/i)).toBeInTheDocument();
      expect(screen.queryByText(/Документ I — Анкета читателя/i)).not.toBeInTheDocument();

      // Переключаемся на Тест
      await user.click(testTab);
      expect(await screen.findByText(/Документ I — Анкета читателя/i)).toBeInTheDocument();
      expect(screen.getByText(/Что вам нравится в книге\?/i)).toBeInTheDocument();

      // Переключаемся на Билет
      await user.click(ticketTab);
      expect(await screen.findByText(/Документ II — Читательский билет/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText(/Документ I — Анкета читателя/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/Бланк пуст/i)).toBeInTheDocument();

      // Переключаемся на Сравнение
      await user.click(duelTab);
      expect(await screen.findByText(/Документ III — Сравнение вкусов/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText(/Документ II — Читательский билет/i)).not.toBeInTheDocument();
      });

      // Переключаемся на Витрину
      await user.click(hubTab);
      expect(await screen.findByText(/Документ IV — Витрина/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText(/Документ III — Сравнение вкусов/i)).not.toBeInTheDocument();
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
      renderPage();

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
      const { unmount } = renderPage();
      const moonBtn = screen.getByRole("button", { name: /Переключить на ночной архив/i });
      await user.click(moonBtn);

      expect(localStorage.getItem("bs_reading_dna_theme")).toBe("dark");
      unmount();

      renderPage();
      expect(screen.getByRole("button", { name: /Переключить на крафтовую анкету/i })).toBeInTheDocument();
    });

    it("восстанавливает сохранённый черновик теста из изолированного localStorage при входе", () => {
      localStorage.setItem(
        "bs_reading_dna_draft_user_1",
        JSON.stringify({
          step: 6,
          axes: { storyFocus: 85, emotionalWeight: 70, pace: 40, darkness: 90, scope: 60, complexity: 75 },
          favoriteBooks: [{ title: "Имя розы", author: "Умберто Эко" }],
          kryptonite: null,
        })
      );

      renderPage();

      expect(screen.getByText(/Печать: ваши книги/i)).toBeInTheDocument();
      expect(screen.getAllByText("Имя розы").length).toBeGreaterThan(0);
      expect(screen.getByText(/Начать заново/i)).toBeInTheDocument();
    });

    it("по умолчанию оси стоят на 0 и кнопка «Дальше» заблокирована, пока пользователь не взаимодействует", async () => {
      const user = userEvent.setup();
      renderPage();

      const testTab = screen.getByRole("button", { name: /^Тест$/i });
      await user.click(testTab);

      const nextBtn = await screen.findByRole("button", { name: /Дальше/i });
      expect(nextBtn).toBeDisabled();

      const slider = screen.getByRole("slider");
      expect(slider).toHaveAttribute("aria-valuenow", "0");
    });

    it("отображает рукописный текст в светлой теме и логотип DNA.webp в тёмной теме", async () => {
      const user = userEvent.setup();
      renderPage();

      expect(screen.getAllByText("Книжный ДНК").length).toBeGreaterThan(0);
      expect(screen.queryByAltText("Книжный ДНК")).not.toBeInTheDocument();

      const themeBtn = screen.getByTitle(/Темный ночной архив/i);
      await user.click(themeBtn);

      const logoImg = await screen.findByAltText("Книжный ДНК");
      expect(logoImg).toHaveAttribute("src", "/images/reading-dna/DNA.webp");
    });

    it("по ссылке ?ticket=X&tab=compare открывает вкладку «Сравнение вкусов»", async () => {
      renderPage("/reading-dna?ticket=BS-1234-X&tab=compare");

      expect(await screen.findByText(/Документ III — Сравнение вкусов/i)).toBeInTheDocument();
      expect(screen.queryByText(/Документ II — Читательский билет/i)).not.toBeInTheDocument();
    });

    it("по ссылке ?ticket=X без tab открывает вкладку «Билет»", async () => {
      renderPage("/reading-dna?ticket=BS-1234-X");

      expect(await screen.findByText(/Документ II — Читательский билет/i)).toBeInTheDocument();
      expect(screen.queryByText(/Документ III — Сравнение вкусов/i)).not.toBeInTheDocument();
    });

    it("по ссылке ?tab=test открывает вкладку «Тест» даже с нулевого шага", async () => {
      renderPage("/reading-dna?tab=test", null);

      expect(await screen.findByText(/Документ I — Анкета читателя/i)).toBeInTheDocument();
      expect(screen.getByText(/Что вам нравится в книге\?/i)).toBeInTheDocument();
    });

    it("при переключении с вкладки сравнения с оппонентом на вкладку «Билет» переключает документ", async () => {
      const user = userEvent.setup();
      renderPage("/reading-dna?tab=compare&with=BS-4530-V", null);

      expect(await screen.findByText(/Документ III — Сравнение вкусов/i)).toBeInTheDocument();

      const ticketTab = screen.getByRole("button", { name: /^Билет$/i });
      await user.click(ticketTab);

      expect(await screen.findByText(/Документ II — Читательский билет/i)).toBeInTheDocument();
      expect(screen.queryByText(/Документ III — Сравнение вкусов/i)).not.toBeInTheDocument();
    });

    it("клик по кнопке «Все сравнения и знаменитости» с одного нажатия возвращает в хаб сравнений", async () => {
      const user = userEvent.setup();
      const mockTicket = {
        id: 1,
        ticketNumber: "BS-1111-A",
        customName: "Тестер",
        archetype: "truth-seeker",
        archetypeName: "Искатель",
        axes: { storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50, scope: 50, complexity: 50 },
        favoriteBooks: [],
      };
      localStorage.setItem("bs_reading_dna_ticket_user_1", JSON.stringify(mockTicket));

      vi.mocked(readingDnaApi.getReadingTicket).mockResolvedValue({
        id: 2,
        ticketNumber: "BS-4530-V",
        customName: "Оппонент",
        axes: { storyFocus: 50, emotionalWeight: 50, pace: 50, darkness: 50, scope: 50, complexity: 50 },
        favoriteBooks: [],
      } as any);

      vi.mocked(readingDnaApi.conductReadingDuel).mockResolvedValue({
        compatibility: 70,
        verdict: "Резонанс",
        breakdown: {},
      } as any);

      renderPage("/reading-dna?tab=compare&with=BS-4530-V");

      // Дожидаемся экрана дуэли
      const backBtn = await screen.findByRole("button", { name: /Все сравнения и знаменитости/i });
      expect(backBtn).toBeInTheDocument();

      // Нажимаем ровно один раз
      await user.click(backBtn);

      // С одного нажатия сразу отображается хаб сравнений
      expect(await screen.findByText(/СРАВНЕНИЕ ВКУСОВ С ДРУЗЬЯМИ/i)).toBeInTheDocument();
      expect(screen.queryByText(/ИТОГ СРАВНЕНИЯ ВКУСОВ/i)).not.toBeInTheDocument();
    });
  });
});
