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

  describe("hover — изолированный от родительского group", () => {
    it("изначально data-book-actions hidden", () => {
      render(<BookCover book={mockBook} onDelete={() => {}} />);
      const card = screen.getByRole("img");
      expect(card).toHaveAttribute("data-book-actions", "hidden");
    });

    it("mouseEnter → data-book-actions visible, mouseLeave → hidden", () => {
      render(<BookCover book={mockBook} onDelete={() => {}} onView={() => {}} />);
      const card = screen.getByRole("img");

      fireEvent.mouseEnter(card);
      expect(card).toHaveAttribute("data-book-actions", "visible");

      fireEvent.mouseLeave(card);
      expect(card).toHaveAttribute("data-book-actions", "hidden");
    });

    it("кнопки получают data-visible=true при наведении", () => {
      render(
        <BookCover
          book={mockBook}
          onDelete={() => {}}
          onEdit={() => {}}
          onView={() => {}}
        />
      );
      const card = screen.getByRole("img");

      fireEvent.mouseEnter(card);

      const deleteBtn = screen.getByLabelText(`Удалить "${mockBook.title}"`);
      const editBtn = screen.getByLabelText(`Редактировать "${mockBook.title}"`);
      const viewBtn = screen.getByLabelText(`Просмотреть "${mockBook.title}"`);

      expect(deleteBtn).toHaveAttribute("data-visible", "true");
      expect(editBtn).toHaveAttribute("data-visible", "true");
      expect(viewBtn).toHaveAttribute("data-visible", "true");
    });

    it("кнопки возвращаются в data-visible=false после ухода мыши", () => {
      render(
        <BookCover
          book={mockBook}
          onDelete={() => {}}
          onEdit={() => {}}
          onView={() => {}}
        />
      );
      const card = screen.getByRole("img");

      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);

      const deleteBtn = screen.getByLabelText(`Удалить "${mockBook.title}"`);
      expect(deleteBtn).toHaveAttribute("data-visible", "false");
    });

    it("hover на одной книге не влияет на data-visible других", () => {
      render(
        <div>
          <BookCover book={{ ...mockBook, id: "1" }} onDelete={() => {}} />
          <BookCover book={{ ...mockBook, id: "2", title: "Other" }} onDelete={() => {}} />
        </div>
      );

      const cards = screen.getAllByRole("img");
      expect(cards).toHaveLength(2);

      fireEvent.mouseEnter(cards[0]);

      expect(cards[0]).toHaveAttribute("data-book-actions", "visible");
      expect(cards[1]).toHaveAttribute("data-book-actions", "hidden");
    });
  });
});
