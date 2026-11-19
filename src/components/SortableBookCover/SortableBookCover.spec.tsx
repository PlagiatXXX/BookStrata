import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { SortableBookCover } from "./SortableBookCover";
import type { Book } from "@/types";

const mockBook: Book = {
  id: "b1",
  title: "Тестовая книга",
  author: "Автор",
  coverImageUrl: "/cover.jpg",
};

describe("SortableBookCover", () => {
  it("не содержит класс touch-none, чтобы не блокировать нативный скролл на мобильных устройствах", () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={["book-b1"]}>
          <SortableBookCover book={mockBook} containerId="tier-1" />
        </SortableContext>
      </DndContext>,
    );

    const sortableWrapper = container.firstElementChild as HTMLElement;
    expect(sortableWrapper).toBeInTheDocument();
    expect(sortableWrapper.className).not.toContain("touch-none");
    expect(sortableWrapper.className).toContain("select-none");
  });
});
