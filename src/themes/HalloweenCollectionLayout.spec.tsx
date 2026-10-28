import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CollectionItem } from "@/types/collection";
import { halloweenTheme } from "./themes/halloween";

vi.mock("@/pages/CollectionPage/DefaultCollectionLayout", () => ({
  DefaultCollectionLayout: ({ collection }: { collection: CollectionItem }) => (
    <h1>{collection.title}</h1>
  ),
}));

import { HalloweenCollectionLayout } from "./HalloweenCollectionLayout";

const collection: CollectionItem = {
  id: 1,
  slug: "halloween-books",
  title: "Книги для хэллоуинской ночи",
  type: "curated",
  categoryId: "horror",
  tiers: {},
  tierOrder: [],
  books: {},
  unrankedBookIds: [],
  excerpt: "Мистическая подборка",
  isFeatured: false,
  coverImageUrl: "",
  bookCovers: [],
  tags: [],
  isPublished: true,
  order: 0,
  theme: "halloween",
  createdAt: "2026-09-08T10:31:40.897Z",
  updatedAt: "2026-10-19T10:00:00.000Z",
};

describe("HalloweenCollectionLayout", () => {
  it("wraps the existing collection layout with Halloween theme and decorations", () => {
    const { container } = render(
      <HalloweenCollectionLayout collection={collection} theme={halloweenTheme} />,
    );

    expect(container.querySelector(".theme-container--halloween")).not.toBeNull();
    expect(container.querySelector(".halloween-atmosphere")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: collection.title }),
    ).toBeInTheDocument();
  });
});
