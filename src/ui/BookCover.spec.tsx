import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BookCover } from "./BookCover";

// BookCover рендерит <Link> (react-router) — тесты оборачиваем в MemoryRouter
function render(ui: Parameters<typeof rtlRender>[0]) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockBook = {
  id: "1",
  title: "Test Book",
  author: "Test Author",
  coverImageUrl: "https://example.com/cover.jpg",
};

describe("BookCover", () => {
  it("renders the book cover image", () => {
    render(<BookCover book={mockBook} />);
    const img = screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", mockBook.coverImageUrl);
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("sets fetchpriority=high when priority prop is true", () => {
    render(<BookCover book={mockBook} priority />);
    const img = screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`);
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("renders placeholder when no coverImageUrl", () => {
    render(<BookCover book={{ ...mockBook, coverImageUrl: "" }} />);
    // Placeholder рендерится, img не должен быть
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  describe("retry загрузки обложки (обрыв сети на мобильных)", () => {
    it("при ошибке загрузки повторно пытается с новым src (bs_retry=1)", () => {
      render(<BookCover book={mockBook} />);
      const img = screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`);

      fireEvent.error(img);

      // img остался, src получил retry-параметр
      const retried = screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`);
      expect(retried).toHaveAttribute(
        "src",
        `${mockBook.coverImageUrl}?bs_retry=1`,
      );
    });

    it("после MAX_COVER_RETRIES ошибок показывает placeholder", () => {
      render(<BookCover book={mockBook} />);

      for (let i = 0; i < 3; i++) {
        const img = screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`);
        fireEvent.error(img);
      }

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("после успешной загрузки src с retry-параметром остаётся (закрепляет кэш)", () => {
      render(<BookCover book={mockBook} />);

      fireEvent.error(screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`));
      fireEvent.load(screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`));

      // placeholder не показан, src остаётся с retry-параметром —
      // этот URL уже в кэше браузера (immutable), следующий показ возьмёт его оттуда
      const img = screen.getByAltText(`Обложка: ${mockBook.title} - ${mockBook.author}`);
      expect(img).toHaveAttribute("src", `${mockBook.coverImageUrl}?bs_retry=1`);
    });
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
    expect(deleteButton).toHaveClass("focus-visible:ring-(--theme-focus)");

    expect(editButton).toHaveClass("focus-visible:ring-2");
    expect(editButton).toHaveClass("focus-visible:ring-(--theme-focus)");

    expect(viewButton).toHaveClass("focus-visible:ring-2");
    expect(viewButton).toHaveClass("focus-visible:ring-(--theme-focus)");
  });

  it("triggers onView on single click of the cover", () => {
    const onView = vi.fn();
    render(<BookCover book={mockBook} onView={onView} />);

    const card = screen.getByTestId("book-cover");
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
    fireEvent.click(card, { clientX: 10, clientY: 10 });

    expect(onView).toHaveBeenCalledWith(mockBook);
  });

  it("не открывает книгу, если курсор сдвинулся от точки нажатия (drag, а не клик)", () => {
    const onView = vi.fn();
    render(<BookCover book={mockBook} onView={onView} />);

    const card = screen.getByTestId("book-cover");
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
    fireEvent.click(card, { clientX: 60, clientY: 60 });

    expect(onView).not.toHaveBeenCalled();
  });

  it("не открывает книгу без события pointerdown (служебный клик)", () => {
    const onView = vi.fn();
    render(<BookCover book={mockBook} onView={onView} />);

    fireEvent.click(screen.getByTestId("book-cover"));

    expect(onView).not.toHaveBeenCalled();
  });

  describe("hover — изолированный от родительского group", () => {
    function getCard() {
      return screen.getByTestId("book-cover");
    }

    it("изначально data-book-actions hidden", () => {
      render(<BookCover book={mockBook} onDelete={() => {}} />);
      expect(getCard()).toHaveAttribute("data-book-actions", "hidden");
    });

    it("mouseEnter → data-book-actions visible, mouseLeave → hidden", () => {
      render(<BookCover book={mockBook} onDelete={() => {}} onView={() => {}} />);
      const card = getCard();

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
      const card = getCard();

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
      const card = getCard();

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

      const cards = screen.getAllByTestId("book-cover");
      expect(cards).toHaveLength(2);

      fireEvent.mouseEnter(cards[0]);

      expect(cards[0]).toHaveAttribute("data-book-actions", "visible");
      expect(cards[1]).toHaveAttribute("data-book-actions", "hidden");
    });
  });

  describe("mobile — клик по книге", () => {
    let originalInnerWidth: number;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 390,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it("клик по книге открывает кнопки, повторный клик закрывает", () => {
      render(
        <BookCover book={mockBook} onDelete={() => {}} onEdit={() => {}} onView={() => {}} />
      );
      const card = screen.getByTestId("book-cover");

      fireEvent.click(card);
      expect(card).toHaveAttribute("data-book-actions", "visible");

      fireEvent.click(card);
      expect(card).toHaveAttribute("data-book-actions", "hidden");
    });

    it("клик по другой книге закрывает кнопки первой", () => {
      render(
        <div>
          <BookCover book={{ ...mockBook, id: "1" }} onDelete={() => {}} />
          <BookCover book={{ ...mockBook, id: "2", title: "Other" }} onDelete={() => {}} />
        </div>
      );

      const cards = screen.getAllByTestId("book-cover");

      fireEvent.click(cards[0]);
      expect(cards[0]).toHaveAttribute("data-book-actions", "visible");

      fireEvent.click(cards[1]);
      expect(cards[0]).toHaveAttribute("data-book-actions", "hidden");
      expect(cards[1]).toHaveAttribute("data-book-actions", "visible");
    });

    it("клик по пустому месту закрывает кнопки", () => {
      render(<BookCover book={mockBook} onDelete={() => {}} />);
      const card = screen.getByTestId("book-cover");

      fireEvent.click(card);
      expect(card).toHaveAttribute("data-book-actions", "visible");

      fireEvent.click(document.body);
      expect(card).toHaveAttribute("data-book-actions", "hidden");
    });
  });

  describe("linkToBook — ссылка на страницу книги (Фаза 5.3)", () => {
    const publishedBook = {
      ...mockBook,
      slug: "anna-karenina",
      status: "published",
    };

    it("published-книга со slug рендерится ссылкой на /books/{slug}", () => {
      render(<BookCover book={publishedBook} linkToBook />);
      const card = screen.getByTestId("book-cover");
      expect(card.tagName).toBe("A");
      expect(card).toHaveAttribute("href", "/books/anna-karenina");
    });

    it("клик по ссылке не открывает модалку просмотра", () => {
      const onView = vi.fn();
      render(<BookCover book={publishedBook} onView={onView} linkToBook />);

      const card = screen.getByTestId("book-cover");
      fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
      fireEvent.click(card, { clientX: 10, clientY: 10 });

      expect(onView).not.toHaveBeenCalled();
      expect(card).toHaveAttribute("href", "/books/anna-karenina");
    });

    it("кнопки действий не показываются для published-книги со ссылкой", () => {
      render(
        <BookCover
          book={publishedBook}
          onDelete={() => {}}
          onEdit={() => {}}
          onView={() => {}}
          linkToBook
        />,
      );
      expect(screen.queryByLabelText(`Просмотреть "${mockBook.title}"`)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(`Удалить "${mockBook.title}"`)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(`Редактировать "${mockBook.title}"`)).not.toBeInTheDocument();
    });

    it("draft-книга не становится ссылкой", () => {
      render(<BookCover book={{ ...mockBook, slug: "draft-kniga", status: "draft" }} linkToBook />);
      const card = screen.getByTestId("book-cover");
      expect(card.tagName).toBe("DIV");
    });

    it("без status не становится ссылкой (снимки без каталога)", () => {
      render(<BookCover book={{ ...mockBook, slug: "tolko-slug" }} linkToBook />);
      expect(screen.getByTestId("book-cover").tagName).toBe("DIV");
    });

    it("без linkToBook остаётся обычной карточкой даже для published", () => {
      render(<BookCover book={publishedBook} />);
      expect(screen.getByTestId("book-cover").tagName).toBe("DIV");
    });
  });
});
