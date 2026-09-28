import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicTierListCards from "./PublicTierListCards";
import type { TierListShort } from "@/lib/tierListApi";

function makeList(overrides: Partial<TierListShort>): TierListShort {
  return {
    id: "tl-1",
    title: "Список",
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    isPublic: true,
    likesCount: 3,
    booksCount: 5,
    ...overrides,
  };
}

function renderCards(tierLists: TierListShort[]) {
  return render(
    <MemoryRouter>
      <PublicTierListCards tierLists={tierLists} likedIdsSet={new Set()} />
    </MemoryRouter>,
  );
}

describe("PublicTierListCards — пометка приватности", () => {
  it("приватный тир-лист показывает пометку «Приватный»", () => {
    renderCards([makeList({ id: "tl-p", title: "Секретный", isPublic: false })]);

    expect(screen.getByText("Приватный")).toBeDefined();
  });

  it("публичный тир-лист без пометки «Приватный»", () => {
    renderCards([makeList({ id: "tl-pub", title: "Открытый", isPublic: true })]);

    expect(screen.queryByText("Приватный")).toBeNull();
  });
});
