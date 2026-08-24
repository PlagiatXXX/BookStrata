import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookEditModal } from "./BookEditModal";

const baseBook = {
  id: 1, title: "Дюна", author: "Герберт", slug: "dune", authorId: null,
  status: "published", genre: null, tags: [], description: "",
  coverImageUrl: "/c/dune.jpg", publishedYear: 1965, isbn: null,
  rating: null, likesCount: 0, isTrending: false,
  contextChain: null, source: null,
  externalId: null, mergedIntoId: null, publishedAt: null,
  slugHistory: [], createdAt: "2024-01-01", updatedAt: "2024-01-01",
  ownerUsername: null, tierListNames: [],
  _count: { comments: 0, placements: 0 },
  authorRel: null,
} as any;

describe("BookEditModal — isTrending", () => {
  it("отправляет isTrending при сохранении", () => {
    const onSave = vi.fn();
    render(
      <BookEditModal book={baseBook} saving={false} publishing={false}
        unpublishing={false} enriching={false} enrichResult={null}
        onSave={onSave} onPublish={vi.fn()} onUnpublish={vi.fn()}
        onEnrich={vi.fn()} onMerge={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ isTrending: true }));
  });

  it("отображает начальное значение isTrending из книги", () => {
    render(
      <BookEditModal book={{ ...baseBook, isTrending: true }} saving={false} publishing={false}
        unpublishing={false} enriching={false} enrichResult={null}
        onSave={vi.fn()} onPublish={vi.fn()} onUnpublish={vi.fn()}
        onEnrich={vi.fn()} onMerge={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
