import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Book, Tier } from "@/types";
import { StaticTierView } from "./StaticTierView";

describe("StaticTierView", () => {
  it("marks read-only tier rows for the mobile stacked layout", () => {
    const tiers: Record<string, Tier> = {
      s: { id: "s", title: "Лучшие", color: "#f00", bookIds: ["book-1"] },
    };
    const books: Record<string, Book> = {
      "book-1": {
        id: "book-1",
        title: "Книга",
        author: "Автор",
        coverImageUrl: "/cover.jpg",
      },
    };

    const { container } = render(
      <StaticTierView tiers={tiers} tierOrder={["s"]} books={books} />,
    );

    expect(container.querySelector(".static-tier-view--mobile-stacked")).not.toBeNull();
    expect(container.querySelector(".nb-tier-row .nb-rank-box")).not.toBeNull();
    expect(container.querySelector(".nb-tier-row .nb-book-track")).not.toBeNull();
  });
});
