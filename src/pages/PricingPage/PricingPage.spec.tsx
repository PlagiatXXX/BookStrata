/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PricingPage from "./PricingPage";

vi.mock("@/components/SEO/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/components/SEO/Breadcrumbs", () => ({
  Breadcrumbs: () => null,
}));

vi.mock("@/ui/ShineBorder", () => ({
  ShineBorder: () => null,
}));

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит заголовок страницы и карточки возможностей", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Угостить автора", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Всё бесплатно")).toBeInTheDocument();
    expect(screen.getByText("Любая")).toBeInTheDocument();
  });

  it("отображает блок прозрачности инфраструктуры и расходов", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Куда идут средства")).toBeInTheDocument();
    expect(screen.getByText(/Сервер приложений/i)).toBeInTheDocument();
    expect(screen.getByText(/База данных PostgreSQL/i)).toBeInTheDocument();
    expect(screen.getByText(/S3-хранилище обложек/i)).toBeInTheDocument();
  });

  it("открывает модалку доната при клике на кнопку «Угостить»", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    );

    const donateBtns = screen.getAllByRole("button", { name: /угостить/i });
    fireEvent.click(donateBtns[0]);

    expect(screen.getByText("Реквизиты для перевода")).toBeInTheDocument();
    expect(screen.getByText("ЮMoney")).toBeInTheDocument();
  });
});
