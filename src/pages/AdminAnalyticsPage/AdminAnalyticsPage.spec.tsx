import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminAnalyticsPage from "./AdminAnalyticsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/analyticsApi", () => ({
  apiGetAnalytics: vi.fn(),
  apiGetAnalyticsSummary: vi.fn(),
  apiGetAnalyticsMetrics: vi.fn(),
  apiGetAnalyticsFunnel: vi.fn(),
  apiGetAnalyticsRetention: vi.fn(),
  apiGetAnalyticsTimeseries: vi.fn(),
  apiGetAnalyticsInsights: vi.fn(),
  apiGetUserJourney: vi.fn(),
}));

vi.mock("@/lib/presenceApi", () => ({
  apiGetOnlinePresence: vi.fn(),
}));

vi.mock("@/lib/supportApi", () => ({
  apiAdminGetOrCreateUserThread: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: { error: vi.fn(), success: vi.fn() },
}));

import {
  apiGetAnalytics,
  apiGetAnalyticsSummary,
  apiGetAnalyticsMetrics,
  apiGetAnalyticsFunnel,
  apiGetAnalyticsRetention,
  apiGetAnalyticsTimeseries,
  apiGetAnalyticsInsights,
  apiGetUserJourney,
} from "@/lib/analyticsApi";
import { apiGetOnlinePresence } from "@/lib/presenceApi";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminAnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminAnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiGetOnlinePresence).mockResolvedValue({
      totalOnline: 3,
      authCount: 1,
      guestCount: 2,
      activeCount: 3,
      idleCount: 0,
      users: [
        {
          userId: 10,
          username: "reader_anna",
          avatarUrl: null,
          role: "user",
          page: "/books/dune",
          deviceType: "desktop",
          status: "active",
          startedAt: "2026-11-27T09:50:00.000Z",
          lastPingAt: "2026-11-27T10:00:00.000Z",
          sessionMinutes: 10,
          isExcluded: false,
        },
        {
          userId: 1,
          username: "fedor",
          avatarUrl: null,
          role: "admin",
          page: "/admin/analytics",
          deviceType: "desktop",
          status: "active",
          startedAt: "2026-11-27T09:55:00.000Z",
          lastPingAt: "2026-11-27T10:00:00.000Z",
          sessionMinutes: 5,
          isExcluded: true,
        },
      ],
      guestsByPage: [{ page: "/collections", count: 2 }],
      guestsByDevice: [{ deviceType: "mobile", count: 2 }],
      updatedAt: "2026-11-27T10:00:00.000Z",
    });

    vi.mocked(apiGetAnalyticsSummary).mockResolvedValue({
      todayTotal: 15,
      todayByEvent: [{ event: "book_search", count: 5 }],
      weekTotal: 120,
      weekByEvent: [],
    });
    vi.mocked(apiGetAnalyticsMetrics).mockResolvedValue({
      dau: 12,
      wau: 30,
      mau: 80,
      stickiness: 15,
      churn: 4,
      churnRate: 5,
      uniqueVisitorsToday: 25,
      deltas: {
        dauYesterday: 10,
        visitorsYesterday: 20,
        newUsersToday: 3,
        newUsersYesterday: 1,
        dauPctChange: 20,
        visitorsPctChange: 25,
      },
    });
    vi.mocked(apiGetAnalyticsTimeseries).mockResolvedValue({
      days: 30,
      points: [
        {
          date: "2026-11-26",
          visitors: 25,
          dau: 12,
          registrations: 3,
          tierlists: 4,
          searches: 9,
          aiRequests: 2,
        },
      ],
    });
    vi.mocked(apiGetAnalyticsInsights).mockResolvedValue({
      days: 30,
      topPages: [{ url: "/books/dune", views: 44, uniqueVisitors: 21 }],
      topSearches: [{ query: "дюна", count: 8, avgResults: 3 }],
      zeroResultSearches: [{ query: "неизвестная книга", count: 3 }],
      devices: [{ deviceType: "mobile", count: 15 }],
      browsers: [{ browser: "Chrome", count: 12 }],
      sources: [{ source: "telegram", visits: 10, uniqueVisitors: 8 }],
      features: {
        aiLibrarianMessages: 5,
        aiAvatars: 2,
        dnaStarted: 7,
        dnaSealed: 4,
        dnaDuels: 2,
        dnaShared: 1,
        exportsPng: 6,
        shares: 3,
        donateOpens: 2,
        donateCopies: 1,
      },
    });
    vi.mocked(apiGetAnalyticsFunnel).mockResolvedValue({
      stages: [{ name: "Регистрация", count: 10 }],
      activation: { days: 30, stages: [{ name: "Регистрация", count: 10 }] },
      acquisition: { days: 30, stages: [{ name: "Визит на сайт", count: 50 }] },
    });
    vi.mocked(apiGetAnalyticsRetention).mockResolvedValue({
      d1: 20,
      d7: 10,
      d30: null,
      cohorts: {
        d1: { eligible: 10, retained: 2, rate: 20 },
        d7: { eligible: 10, retained: 1, rate: 10 },
        d30: { eligible: 0, retained: 0, rate: null },
      },
      weeklyMatrix: [{ weekStart: "2026-11-23", cohortSize: 10, retentionByWeek: [100, 30, null, null, null] }],
    });
    vi.mocked(apiGetAnalytics).mockResolvedValue({
      events: [
        {
          id: "101",
          userId: null,
          anonymousId: "anon-abcdef",
          sessionId: "sess-1",
          event: "book_search",
          meta: { query: "редкая книга", resultsCount: 0 },
          url: "/tier-lists/new",
          ip: null,
          userAgent: null,
          deviceType: "mobile",
          browser: "Chrome",
          os: "Android",
          referrer: null,
          utmSource: "telegram",
          utmMedium: null,
          utmCampaign: null,
          createdAt: "2026-11-27T10:00:00.000Z",
          username: null,
        },
      ],
      nextCursor: null,
      total: 1,
    });
    vi.mocked(apiGetUserJourney).mockResolvedValue({
      user: {
        userId: 10,
        username: "reader_anna",
        avatarUrl: null,
        role: "user",
        isPro: true,
        createdAt: "2026-11-01T10:00:00.000Z",
        lastActivityAt: "2026-11-27T10:00:00.000Z",
        totalActiveMinutes: 45,
        tierListsCount: 2,
        commentsCount: 3,
        likesGivenCount: 5,
      },
      anonymousId: "anon-anna",
      firstSource: { referrer: null, utmSource: "telegram", utmMedium: null, utmCampaign: null },
      devices: ["desktop (Chrome)"],
      events: [],
    });
  });

  it("отображает Live онлайн, график динамики и открывает путь пользователя по клику", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Сейчас на сайте")).toBeInTheDocument();
      expect(screen.getByText("Динамика по дням")).toBeInTheDocument();
    });

    expect(screen.getByText("скрыт из метрик")).toBeInTheDocument();
    await userEvent.click(screen.getByText("reader_anna"));

    await waitFor(() => {
      expect(apiGetUserJourney).toHaveBeenCalledWith({
        userId: 10,
        anonymousId: undefined,
      });
      expect(screen.getByText("Путь пользователя")).toBeInTheDocument();
    });
  });

  it("переключает табы Контент/Поиск и Воронки/Когорты без перезагрузки страницы", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Контент, Поиск и Трафик" }));
    await waitFor(() => {
      expect(screen.getByText("Пустые поиски (ничего не найдено)")).toBeInTheDocument();
      expect(screen.getByText("«неизвестная книга»")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Воронки и Когорты" }));
    await waitFor(() => {
      expect(screen.getByText("Воронка гостя (Acquisition)")).toBeInTheDocument();
      expect(screen.getByText("Недельная когортная матрица")).toBeInTheDocument();
    });
  });

  it("по умолчанию скрывает page_view и отображает контекст (0 найдено, telegram, гость)", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Лента событий" }));

    await waitFor(() => {
      expect(apiGetAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ excludeEvents: "page_view" }),
      );
      expect(screen.getByText("(0 найдено)")).toBeInTheDocument();
    });

    expect(screen.getByText("telegram")).toBeInTheDocument();
    expect(screen.getByText("гость #anon-a")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Скрывать page_view/i }));
    await waitFor(() => {
      expect(apiGetAnalytics).toHaveBeenLastCalledWith(
        expect.objectContaining({ excludeEvents: undefined }),
      );
    });
  });
});
