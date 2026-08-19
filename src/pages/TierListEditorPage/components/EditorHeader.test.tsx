// src/pages/TierListEditorPage/components/EditorHeader.test.tsx
// Read-only режим: ровно один H1 (мобильная/десктопная версии названия не дублируют
// семантику заголовка — решает h1_multiple на публичных тир-листах).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/tierListApi", () => ({
  forkTierList: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: { action: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/LikeButton", () => ({
  LikeButton: () => <button type="button">Нравится</button>,
}));

vi.mock("@/components/DashboardHeroSection/components/TierListCover", () => ({
  TierListCover: () => <div data-testid="tier-cover" />,
}));

import { EditorHeader } from "./EditorHeader";

const baseProps = {
  title: "Книги",
  isReadOnly: true,
  tierListId: "tl-1",
  coverImageUrl: "https://example.com/cover.jpg",
  booksCount: 5,
};

describe("EditorHeader (read-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит ровно один H1 с названием тир-листа", () => {
    render(<EditorHeader {...baseProps} />);

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent("Книги");
  });

  it("показывает название в двух блоках (мобилка и десктоп), но второй — не заголовок", () => {
    render(<EditorHeader {...baseProps} />);

    // Текст «Книги» есть в обоих адаптивных блоках
    expect(screen.getAllByText("Книги")).toHaveLength(2);
    // Заголовок уровня 1 — только один
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("в режиме редактирования — один H1 по центру", () => {
    render(<EditorHeader {...baseProps} isReadOnly={false} />);

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent("Книги");
  });
});
