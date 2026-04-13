import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookCover } from "./BookCover";

const mockBook = {
  id: "1",
  title: "Test Book",
  author: "Test Author",
  coverImageUrl: "https://example.com/cover.jpg",
};

describe("BookCover", () => {
  it("renders the book cover image", () => {
    render(<BookCover book={mockBook} />);
    const card = screen.getByRole("img");
    expect(card).toHaveStyle(`background-image: url("${mockBook.coverImageUrl}")`);
    expect(card).toHaveAttribute("aria-label", `${mockBook.title} - ${mockBook.author}`);
  });

  it("renders the View button when onView is provided", () => {
    const onView = vi.fn();
    render(<BookCover book={mockBook} onView={onView} />);

    const viewButton = screen.getByLabelText(`Просмотреть "${mockBook.title}"`);
    expect(viewButton).toBeInTheDocument();

    fireEvent.click(viewButton);
    expect(onView).toHaveBeenCalledWith(mockBook);
  });

  it("applies focus-visible ring classes to action buttons", () => {
    render(
      <BookCover
        book={mockBook}
        onDelete={() => {}}
        onEdit={() => {}}
        onView={() => {}}
      />
    );

    const deleteButton = screen.getByLabelText(`Удалить "${mockBook.title}"`);
    const editButton = screen.getByLabelText(`Редактировать "${mockBook.title}"`);
    const viewButton = screen.getByLabelText(`Просмотреть "${mockBook.title}"`);

    expect(deleteButton).toHaveClass("focus-visible:ring-2");
    expect(deleteButton).toHaveClass("focus-visible:ring-cyan-400");

    expect(editButton).toHaveClass("focus-visible:ring-2");
    expect(editButton).toHaveClass("focus-visible:ring-cyan-400");

    expect(viewButton).toHaveClass("focus-visible:ring-2");
    expect(viewButton).toHaveClass("focus-visible:ring-cyan-400");
  });

  it("triggers onView on double click of the cover", () => {
    const onView = vi.fn();
    render(<BookCover book={mockBook} onView={onView} />);

    const card = screen.getByRole("img");
    fireEvent.doubleClick(card);

    expect(onView).toHaveBeenCalledWith(mockBook);
  });
});
