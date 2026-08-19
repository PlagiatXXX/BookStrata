// src/components/BookViewModal/BookViewModal.spec.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BookViewModal } from "./BookViewModal";

vi.mock("@/ui/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/useBookshelf", () => ({
  useBookshelf: () => ({ shelf: {}, toggleStatus: vi.fn() }),
}));
vi.mock("@/lib/ratingsApi", () => ({
  getBookRatings: vi.fn().mockResolvedValue(null),
}));

const baseBook = {
  id: "1",
  title: "1984",
  author: "Джордж Оруэлл",
  coverImageUrl: "/c.jpg",
  description: "Антиутопия",
  thoughts: "Прочитал в школе",
};

describe("BookViewModal: ссылка на страницу книги (единый каталог, 19.08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("published-книга с slug → кнопка «Страница книги» с ?from=tierListId", () => {
    render(
      <MemoryRouter>
        <BookViewModal
          isOpen
          book={{ ...baseBook, status: "published", slug: "1984" } as never}
          onClose={() => {}}
          tierListId="list-1"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Открыть страницу книги" });
    expect(link).toHaveAttribute("href", "/books/1984?from=list-1");
  });

  it("published-книга: без tierListId ссылка без ?from", () => {
    render(
      <MemoryRouter>
        <BookViewModal
          isOpen
          book={{ ...baseBook, status: "published", slug: "1984" } as never}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Открыть страницу книги" });
    expect(link).toHaveAttribute("href", "/books/1984");
  });

  it("draft-книга → ссылки на страницу книги нет", () => {
    render(
      <MemoryRouter>
        <BookViewModal
          isOpen
          book={{ ...baseBook, status: "draft", slug: null } as never}
          onClose={() => {}}
          tierListId="list-1"
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: "Открыть страницу книги" })).not.toBeInTheDocument();
  });

  it("published без slug → ссылки нет", () => {
    render(
      <MemoryRouter>
        <BookViewModal
          isOpen
          book={{ ...baseBook, status: "published", slug: null } as never}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: "Открыть страницу книги" })).not.toBeInTheDocument();
  });
});